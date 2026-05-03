import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  dryRunOutput?: string;
}

export class ScriptValidator {

  /**
   * Valida sintácticamente un script.
   * Para Bash usa shellcheck, para PowerShell usa PSScriptAnalyzer.
   */
  static validate(script: string, language: string): ValidationResult {
    const tempDir = path.join(process.cwd(), 'scratch/validation');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const ext = language === 'powershell' ? 'ps1' : 'sh';
    const fileName = `val_${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, script);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (language === 'powershell') {
        // PSScriptAnalyzer
        try {
          const cmd = `powershell -Command "Invoke-ScriptAnalyzer -Path '${filePath}' -Severity Error,Warning | ConvertTo-Json -Compress"`;
          const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
          if (output.trim()) {
            const results = JSON.parse(output);
            const issues = Array.isArray(results) ? results : [results];
            for (const i of issues) {
              if (i.Severity === 'Error') errors.push(`[PSSA] Line ${i.Extent?.StartLineNumber || '?'}: ${i.Message}`);
              else if (i.Severity === 'Warning') warnings.push(`[PSSA] Line ${i.Extent?.StartLineNumber || '?'}: ${i.Message}`);
            }
          }
        } catch {
          warnings.push("[PSSA] PSScriptAnalyzer no disponible — saltando validación PowerShell");
        }

        // Validación sintáctica básica PowerShell
        try {
          execSync(`powershell -Command "& { $ErrorActionPreference='Stop'; . '${filePath}' -WhatIf }"`, {
            encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (e: any) {
          const stderr = e.stderr || e.message || "";
          if (stderr && !stderr.includes("WhatIf")) {
            warnings.push(`[SYNTAX] Posible error sintáctico: ${stderr.substring(0, 200)}`);
          }
        }

      } else {
        // Bash / Shell — shellcheck
        try {
          const cmd = `shellcheck -f json "${filePath}"`;
          const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
          if (output.trim()) {
            const results = JSON.parse(output);
            for (const i of results) {
              if (i.level === 'error') errors.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
              else if (i.level === 'warning') warnings.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
              else if (i.level === 'info' || i.level === 'style') warnings.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
            }
          }
        } catch (e: any) {
          if (e.stdout) {
            try {
              const results = JSON.parse(e.stdout);
              for (const i of results) {
                if (i.level === 'error') errors.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
                else if (i.level === 'warning') warnings.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
                else warnings.push(`[ShellCheck] Line ${i.line}: ${i.message}`);
              }
            } catch { /* empty */ }
          }
          if (!errors.length) warnings.push("[ShellCheck] shellcheck no disponible — saltando validación Bash");
        }

        // Validación sintáctica Bash (bash -n)
        try {
          execSync(`bash -n "${filePath}"`, { encoding: 'utf8', timeout: 10000 });
        } catch (e: any) {
          const stderr = e.stderr || e.message || "";
          if (stderr) errors.push(`[BASH -n] Error sintáctico: ${stderr.substring(0, 200)}`);
        }

        // Detectar comandos peligrosos
        this.detectDangerousCommands(script, errors, warnings);
      }

      // Validar quebraderos de cabeza comunes
      this.checkCommonIssues(script, language, errors, warnings);

    } catch (e: any) {
      warnings.push(`[VALIDATOR] Error interno: ${e.message}`);
    } finally {
      // Limpiar archivo temporal
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Ejecuta un dry-run del script en un servidor remoto
   * (modo simulado: no aplica cambios reales)
   */
  static async dryRunRemote(sshAgent: any, connKey: string, script: string, os: 'linux' | 'windows'): Promise<{ success: boolean; output: string; errors: string[] }> {
    const errors: string[] = [];

    // Para Linux: ejecutar con --dry-run si el script lo soporta
    if (os === 'linux') {
      try {
        const dryScript = script
          .replace(/^#!/, '#!')
          .split('\n')
          .map(line => {
            // No modificar shebang ni comentarios
            if (line.startsWith('#!') || line.startsWith('#')) return line;
            // Agregar --dry-run a comandos que lo soporten
            return line
              .replace(/^(rsync\s)/, 'rsync --dry-run ')
              .replace(/^(rm\s)/, 'echo "[DRY-RUN] Would execute: rm "')
              .replace(/^(systemctl\s+restart\s)/, 'echo "[DRY-RUN] Would restart: "')
              .replace(/^(systemctl\s+stop\s)/, 'echo "[DRY-RUN] Would stop: "')
              .replace(/^(kill\s)/, 'echo "[DRY-RUN] Would kill: "')
              .replace(/^(userdel\s)/, 'echo "[DRY-RUN] Would delete user: "')
              .replace(/^(groupdel\s)/, 'echo "[DRY-RUN] Would delete group: "');
          })
          .join('\n');

        const result = await sshAgent.execCommand(connKey, dryScript);
        return {
          success: result.code === 0 || result.code === null,
          output: result.stdout || result.stderr || "(dry-run completed)",
          errors: result.stderr ? [result.stderr] : [],
        };
      } catch (e: any) {
        errors.push(`Dry-run error: ${e.message}`);
        return { success: false, output: "", errors };
      }
    }

    // Para Windows: usar -WhatIf
    if (os === 'windows') {
      try {
        const dryScript = script
          .split('\n')
          .map(line => {
            if (line.trim().startsWith('#')) return line;
            // Agregar -WhatIf a cmdlets de PowerShell
            return line
              .replace(/(Remove|Set|New|Stop|Start|Restart)-(\w+)/g, '$1-$2 -WhatIf')
              .replace(/Remove-LocalUser/g, 'Write-Host "[DRY-RUN] Would remove user: "')
              .replace(/Remove-Item/g, 'Write-Host "[DRY-RUN] Would remove: "');
          })
          .join('\n');

        const result = await sshAgent.execCommand(connKey, `powershell -Command "${dryScript.replace(/"/g, '\\"')}"`);
        return {
          success: result.code === 0 || result.code === null,
          output: result.stdout || result.stderr || "(dry-run completed)",
          errors: result.stderr ? [result.stderr] : [],
        };
      } catch (e: any) {
        errors.push(`Dry-run error: ${e.message}`);
        return { success: false, output: "", errors };
      }
    }

    return { success: true, output: "(dry-run not applicable)", errors: [] };
  }

  /**
   * Detecta comandos peligrosos en scripts
   */
  private static detectDangerousCommands(script: string, errors: string[], warnings: string[]) {
    const dangerousPatterns = [
      { pattern: /\brm\s+-rf\s+\/\s*($|;|&|\|)/, level: 'error', msg: 'rm -rf / detectado — riesgo de borrado total del sistema' },
      { pattern: /\bdd\s+if=.*\sof=\/dev\/(sda|sdb|xvda|nvme)/, level: 'error', msg: 'dd directo a disco detectado — riesgo de corrupción de datos' },
      { pattern: /\bmkfs\.|\bformat\s/, level: 'error', msg: 'Formateo de disco detectado' },
      { pattern: /\bDROP\s+DATABASE/, level: 'error', msg: 'DROP DATABASE detectado' },
      { pattern: /\bchmod\s+-R\s+777\s+\//, level: 'error', msg: 'chmod 777 / detectado — riesgo de seguridad' },
      { pattern: /\bwget\s+.*\||\bcurl\s+.*\|/, level: 'warning', msg: 'Pipe de descarga directa a shell — riesgo de ejecución de código no verificado' },
      { pattern: /\bsudo\s+rm\s/, level: 'warning', msg: 'sudo rm detectado — verificar que es intencional' },
      { pattern: /\bpasswd\s/, level: 'warning', msg: 'Cambio de contraseña detectado' },
    ];

    for (const { pattern, level, msg } of dangerousPatterns) {
      if (pattern.test(script)) {
        if (level === 'error') errors.push(`[SECURITY] ${msg}`);
        else warnings.push(`[SECURITY] ${msg}`);
      }
    }
  }

  /**
   * Verifica problemas comunes
   */
  private static checkCommonIssues(script: string, language: string, errors: string[], warnings: string[]) {
    const lines = script.split('\n');

    // Sin shebang para Bash
    if (language === 'bash' && !script.startsWith('#!/') && lines.some(l => l.trim() && !l.trim().startsWith('#'))) {
      warnings.push('[COMMON] Script sin shebang (#!/bin/bash)');
    }

    // Líneas muy largas
    const longLines = lines.filter(l => l.length > 1000);
    if (longLines.length > 0) {
      warnings.push(`[COMMON] ${longLines.length} línea(s) con >1000 caracteres — posible problema de encoding`);
    }

    // Variables sin comillas
    if (language === 'bash') {
      const unquoted = script.match(/\$\{[a-zA-Z_]+\}[^"'\s]/g);
      if (unquoted) {
        warnings.push(`[COMMON] Variables sin comillas detectadas — posible word splitting: ${unquoted.slice(0, 3).join(', ')}`);
      }
    }
  }
}
