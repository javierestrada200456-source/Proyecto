import fs from 'fs';
const path = 'c:\\Users\\USER\\OneDrive\\Documentos\\Proyecto\\AppMedicamentos\\src\\components\\PanelPrincipal\\AlarmaYRecordatorio\\AlarmScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { Audio } from 'expo-av';",
  "import { Audio } from 'expo-av';\nimport { notifyCaregivers } from '../../../services/CaregiverNotifications';"
);

content = content.replace(
  `  const sendCaregiverNotification = async (medData) => {
      // TODO: Implementar llamada real a backend o notificación local
      console.log("Enviando notificación al cuidador sobre toma de:", medData.medName);
      // Ejemplo: supabase.rpc('notify_caregiver', { ... })
  };`,
  `  const sendCaregiverNotification = async (medData) => {
      notifyCaregivers(
         '✅ [Nombre del paciente] se tomó su dosis',
         '[Nombre del paciente] se acaba de tomar su dosis de [Nombre del medicamento]',
         medData
      );
  };`
);
fs.writeFileSync(path, content);
