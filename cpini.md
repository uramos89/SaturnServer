# ContextP // initialization file (v2.0.0)
<!-- 
Metodología de Memoria Contextual Parametrizada
Framework: OBPA (Observe, Propose, Execute, Bitácora, Consolidate)
Autor: Ulises Ramos Marín
-->

## 0. PROTOCOLO DE ARRANQUE AGÉNTICO
Al leer este archivo, el AGENTE debe:
1. Reconocer que este proyecto utiliza **ContextP** como memoria organizacional.
2. Verificar la existencia del directorio `ContextP/` o su representación en la base de datos operativa.
3. Si no existe, ejecutar el comando interno: `INITIALIZE CONTEXTP`.
4. Informar al usuario del estado actual de los contratos y la deuda técnica registrada.

## 1. ESTRUCTURA DE MEMORIA (OBPA)
La base de conocimiento se organiza en los siguientes módulos:
- **_INDEX/**: Índice maestro de patrones y soluciones (`INDEX_MASTER.md`).
- **CONTRACTS/**: Reglas invariantes jerárquicas (ROOT > TECH > FUNC > STRUCT > AUDIT).
- **TECH/**: Conocimiento técnico específico (stacks, lenguajes, APIs).
- **FUNC/**: Soluciones a problemas de dominio funcional.
- **STRUCT/**: Patrones de arquitectura y plantillas reutilizables.
- **AUDIT/**: Registro episódico de éxitos (`/success`) y fracasos (`/failure`).
- **PARAMS/**: Parámetros configurables y preferencias del desarrollador.

## 2. COMANDO DE INGESTA UNIVERSAL
Para poblar la memoria organizacional desde un codebase existente, el usuario debe invocar:
`INGEST CODEBASE`

**Al recibirlo, el AGENTE debe:**
1. Escanear el código fuente detectando stacks y convenciones.
2. Documentar patrones encontrados en `STRUCT/`.
3. Detectar deuda técnica y riesgos en `AUDIT/exploration_log/`.
4. Establecer los contratos iniciales en `CONTRACTS/`.

## 3. REGLAS DE ORO (ROOTS)
- No se olvida: Cada sesión debe comenzar leyendo el último estado en `AUDIT/`.
- No se repite error: Antes de proponer, consultar `AUDIT/failure/`.
- No se viola contrato: Toda ejecución debe ser validada contra `CONTRACTS/ROOT_CONTRACT.md`.

---
*La memoria es el nuevo código.*
