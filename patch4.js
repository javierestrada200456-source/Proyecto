import fs from 'fs';
const path = 'c:\\Users\\USER\\OneDrive\\Documentos\\Proyecto\\AppMedicamentos\\src\\components\\PanelPrincipal\\AlarmaYRecordatorio\\AlarmOverlay.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      // type 3 = DELIVERED: notificación mostrada automáticamente.
      // Solo mostramos AlarmScreen si el teléfono está bloqueado/pantalla apagada.
      if (type === 3) {
        handleNotificationEvent(detail, false);
        return;
      }`,
  `      // type 3 = DELIVERED: notificación mostrada automáticamente.
      // Notificamos al cuidador que es la hora.
      if (type === 3) {
        if (detail?.notification?.data) {
          notifyCaregivers(
             '��� Es hora de la dosis',
             'Hola [Nombre Cuidador], Es hora de la [Nombre dosis] dosis para [Nombre de paciente]',
             detail.notification.data
          );
        }
        handleNotificationEvent(detail, false);
        return;
      }`
);
fs.writeFileSync(path, content);
