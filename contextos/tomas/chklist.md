# Checklist de Desarrollo - Tomás

Lista de 13 objetivos pendientes ordenados por nivel de complejidad técnica para el agente de IA.

## 🟢 Fáciles (Implementación Rápida / Bajo Riesgo)
- [ ] **Progresión Guiada y Bloqueo de Mapas:** Bloquear visual y funcionalmente mapas en Modo Explorar hasta cumplir requisitos, guiando la ruta del jugador.
- [ ] **Sistema Bilingüe Nativo Escalonable:** Arquitectura i18n completa para soportar inglés de forma sólida sin traducciones parcheadas.
- [ ] **Dashboard Administrador Independiente:** Proyecto frontend paralelo conectado a Supabase para métricas, análisis de patrones y gestión de bans/cuentas.
- [ ] **Retención Mensual y Recompensas:** Entregas diarias/semanales/mensuales basadas en tiempo de servidor para fidelizar a la comunidad.
- [ ] **Pulido Visual y de Colores:** Ajustes finos de CSS, gradientes y diseño (requerirá confirmación visual tuya).

## 🟡 Medios (Requieren Pruebas / Lógica Compleja)
- [ ] **Animación y Física (Agacharse):** Sincronizar acción física, visual y hitbox del personaje sin romper la jugabilidad actual (requerirá feedback tuyo para alinear píxeles).
- [ ] **Sistema de Tutorial (Gamificación):** Guía interactiva paso a paso para enseñar controles, movimiento y mecánicas.
- [ ] **Nuevo Modo de Juego:** Lógica, mapas y reglas de victoria nuevas reutilizando la base de personajes y controles.
- [ ] **Ranking Global y Chat:** Leaderboards y sistema de mensajes de comunidad en tiempo real compartiendo datos cruzados.
- [ ] **Economía (Multiplicador por Publicidad):** Refactorizar el atractivo del oro y preparar los hooks para inyectar oro doble a cambio de ver anuncios.

## 🔴 Difíciles (Alto Riesgo Técnico / Dependencias Externas)
- [ ] **Cámara Independiente en Multijugador:** Separar la cámara del host y el guest en la misma pantalla (Split-Screen o viewports múltiples) sin destruir el rendimiento ni desincronizar la red.
- [ ] **Integración de Monetización y Ads:** Implementación real de la publicidad. Técnicamente frágil de testear en desarrollo debido a AdBlocks y restricciones web/PWA.
- [ ] **Sistema de Subastas Internas:** Mercado libre entre jugadores por oro. Requiere lógica transaccional muy estricta en la base de datos para evitar robos o duplicación de dinero/ítems.
