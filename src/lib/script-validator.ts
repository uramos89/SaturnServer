import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class ScriptValidator {
  static validate(script: string, language: string): { success: boolean; errors: string[] } {
    const tempDir = path.join(process.cwd(), 'scratch/validation');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const fileName = `val_${crypto.randomUUID()}.${language === 'powershell' ? 'ps1' : 'sh'}`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, script);

    let errors: string[] = [];
    try {
      if (language === 'powershell') {
        // Run PSScriptAnalyzer (requires the module to be installed)
        const cmd = `powershell -Command "Invoke-ScriptAnalyzer -Path '${filePath}' | ConvertTo-Json"`;
        const output = execSync(cmd, { encoding: 'utf8' });
        if (output.trim()) {
          const results = JSON.parse(output);
          const issues = Array.isArray(results) ? results : [results];
          errors = issues
            .filter((i: any) => i.Severity === 'Error' || i.Severity === 'Warning')
            .map((i: any) => `[${i.Severity}] Line ${i.Extent.StartLineNumber}: ${i.Message}`);
        }
      } else if (language === 'bash') {
        // Run shellcheck (requires shellcheck.exe to be in PATH)
        try {
          const cmd = `shellcheck -f json "${filePath}"`;
          const output = execSync(cmd, { encoding: 'utf8' });
          const results = JSON.parse(output);
          errors = results.map((i: any) => `[${i.level}] Line ${i.line}: ${i.message}`);
        } catch (e: any) {
          if (e.stderr) errors.push(e.stderr);
          else if (e.stdout) {
             const results = JSON.parse(e.stdout);
             errors = results.map((i: any) => `[${i.level}] Line ${i.line}: ${i.message}`);
          }
        }
      }
    } catch (e: any) {
      // If tool is missing, we log it but don't fail the whole process for now
      console.warn(`Validation tool for ${language} failed or missing:`, e.message);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }
}
