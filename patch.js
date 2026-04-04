import fs from 'fs';
const path = 'c:\\Users\\USER\\OneDrive\\Documentos\\Proyecto\\AppMedicamentos\\src\\components\\PanelPrincipal\\AlarmaYRecordatorio\\AlarmaYRecordatorio.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "saveVisibleReminders(newVisibleIds);\n\n          showToast({",
  "saveVisibleReminders(newVisibleIds);\n\n          notifyCaregivers('Ì≤ä Nuevo recordatorio', '[Nombre del paciente] acaba de a√±adir un nuevo recordatorio [Nombre del medicamento]', { medName: alarmDataToSchedule.medName });\n\n          showToast({"
);
fs.writeFileSync(path, content);
