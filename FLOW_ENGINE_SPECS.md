# Dreambuilt Flow Engine - Documentación Técnica

## 1. Visión General
El objetivo es transformar el sistema actual de automatización lineal en un motor de flujos visuales ("Flow Engine") que permita segmentación avanzada, lógica condicional y gestión multi-canal (WhatsApp inicial).

## 2. Arquitectura de Datos (Backend)

### 2.1 Nuevas Entidades

#### `Flow` (Flujos)
Representa un diagrama de automatización completo.
- `id`: PK
- `name`: Nombre del flujo (ej: "Captación Casa Arca")
- `description`: Descripción
- `trigger_keywords`: Array de palabras clave que activan este flujo (ej: ["olaya", "info olaya"])
- `nodes`: JSONB - Configuración visual de los nodos (posición, tipo, datos)
- `edges`: JSONB - Conexiones entre nodos
- `is_active`: Boolean
- `created_at`, `updated_at`

#### `Tag` (Etiquetas)
Para segmentación de leads.
- `id`: PK
- `name`: Nombre (ej: "Interés Alto", "Presupuesto < 1M")
- `color`: Hex code para UI
- `category`: Agrupación (ej: "Origen", "Estado", "Perfil")

#### `LeadTag` (Relación Lead-Tag)
- `lead_id`: FK
- `tag_id`: FK

#### `FlowSession` (Sesión de Flujo)
Mantiene el estado de un usuario dentro de un flujo.
- `id`: PK
- `lead_id`: FK
- `flow_id`: FK
- `current_node_id`: ID del nodo donde está el usuario
- `variables`: JSONB - Respuestas acumuladas (ej: { "presupuesto": "2M" })
- `status`: 'ACTIVE', 'COMPLETED', 'PAUSED'
- `last_interaction`: Timestamp

### 2.2 Modificaciones a Entidades Existentes

#### `Lead`
- Agregar `metadata`: JSONB para UTMs (utm_source, utm_campaign) y datos técnicos extra.

## 3. Tipos de Nodos (Flow Nodes)

1.  **Trigger Node (Inicio)**
    *   Configuración: Palabra clave, Origen (Web, Directo, Ads).
2.  **Message Node (Mensaje)**
    *   Configuración: Texto, Imagen, Video, Audio.
3.  **Question Node (Pregunta)**
    *   Configuración: Pregunta, Tipo de respuesta esperada (Texto, Número, Opciones), Variable donde guardar.
4.  **Condition Node (Lógica)**
    *   Configuración: Variable a evaluar, Operador (Igual a, Contiene), Rutas (Sí/No).
5.  **AI Node (Inteligencia)**
    *   Configuración: Prompt de sistema, Modelo (Gemini), Contexto a inyectar.
6.  **Action Node (Acción)**
    *   Configuración: Asignar Tag, Cambiar Estado Lead, Asignar Asesor.

## 4. Lógica de Ejecución (Runtime)

### Flujo de Entrada de Mensajes (`WhatsappService`)

1.  **Recepción:** Llega mensaje de `+52...`
2.  **Identificación:** ¿Existe el Lead? Si no, crear.
3.  **Sesión Activa:** ¿Tiene una `FlowSession` con status `ACTIVE`?
    *   **SÍ:**
        *   Pasar mensaje al nodo actual (`current_node_id`).
        *   Validar respuesta (si es nodo Pregunta).
        *   Ejecutar lógica de transición (Edges).
        *   Mover a siguiente nodo.
        *   Ejecutar acción del siguiente nodo (enviar mensaje, etc.).
    *   **NO:**
        *   Buscar `Flow` que coincida con Keywords en el mensaje.
        *   Si hay coincidencia -> Crear `FlowSession` en el Nodo Inicio.
        *   Si no hay coincidencia -> Usar Flujo Default (IA General).

## 5. Estrategia de Segmentación

*   **Por Origen (UTMs):** Si el link de WhatsApp es `wa.me/...?text=InfoArca`, el Trigger detecta "InfoArca" y asigna Tag "Origen: Ads Arca".
*   **Por Comportamiento:** Si en el flujo responde "Presupuesto Alto", el Action Node asigna Tag "High Ticket".

## 6. Plan de Migración

1.  Crear tablas en BD.
2.  Implementar API CRUD para Flujos.
3.  Construir Editor Visual en Frontend.
4.  Implementar Motor de Ejecución en Backend (v1 en paralelo).
5.  Migrar configuración actual a un "Flujo Legacy".
