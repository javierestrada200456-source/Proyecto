import { supabase } from './supabaseClient';

export const notifyCaregivers = async (titleTemplate, bodyTemplate, medData = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.log('[notifyCaregivers] sin usuario'); return; }

    // Obtener mis datos (Paciente) — primero de auth metadata (más fiable),
    // luego de la tabla profiles como respaldo
    const meta = user.user_metadata || {};
    let patientName = meta.full_name || meta.username || meta.name || null;

    if (!patientName) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('name, full_name, username')
        .eq('id', user.id)
        .limit(1);

      const patientProfile = profileRows?.[0];
      // Ignorar valores que sean placeholders genéricos
      const PLACEHOLDERS = ['nombre del paciente', 'paciente', 'usuario', 'sin nombre', 'user'];
      const rawName = patientProfile?.name || patientProfile?.full_name || patientProfile?.username || '';
      patientName = PLACEHOLDERS.includes(rawName.toLowerCase().trim()) ? null : rawName;
    }

    // Último recurso: parte del email
    if (!patientName) {
      patientName = user.email?.split('@')[0] || 'Tu paciente';
    }

    // Obtener IDs de los cuidadores conectados
    const { data: links, error: linksError } = await supabase
      .from('shared_links')
      .select('viewer_id')
      .eq('owner_id', user.id);

    console.log('[notifyCaregivers] links:', links, 'error:', linksError);
    if (!links || links.length === 0) { console.log('[notifyCaregivers] sin cuidadores vinculados'); return; }

    const caregiverIds = links.map(l => l.viewer_id);

    // Obtener push tokens de esos cuidadores
    const { data: tokensMap, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', caregiverIds);

    console.log('[notifyCaregivers] tokens:', tokensMap, 'error:', tokensError);
    if (!tokensMap || tokensMap.length === 0) { console.log('[notifyCaregivers] sin tokens de cuidadores'); return; }

    // Obtener perfiles de los cuidadores para sus nombres
    const { data: caregiverProfiles } = await supabase
      .from('profiles')
      .select('id, name, full_name, username')
      .in('id', caregiverIds);

    const messages = [];

    for (const tokenRow of tokensMap) {
      if (!tokenRow.token) continue;
      
      const cgProf = caregiverProfiles?.find(p => p.id === tokenRow.user_id);
      const caregiverName = cgProf?.name || cgProf?.full_name || cgProf?.username || 'Cuidador';

      let finalTitle = titleTemplate
          .replace(/\[(Nombre\s+Cuidador|Cuidador)\]/gi, caregiverName)
          .replace(/\[(Nombre\s+de\s+paciente|Nombre\s+del\s+paciente|Paciente)\]/gi, patientName)
          .replace(/\[(Nombre\s+del\s+medicamento|Nombre\s+dosis|medicamento|dosis)\]/gi, medData.medName || 'su dosis');

      let finalBody = bodyTemplate
          .replace(/\[(Nombre\s+Cuidador|Cuidador)\]/gi, caregiverName)
          .replace(/\[(Nombre\s+de\s+paciente|Nombre\s+del\s+paciente|Paciente)\]/gi, patientName)
          .replace(/\[(Nombre\s+del\s+medicamento|Nombre\s+dosis|medicamento|dosis)\]/gi, medData.medName || 'su dosis');

      messages.push({
        to: tokenRow.token,
        sound: 'default',
        title: finalTitle,
        body: finalBody,
        data: { medData, isCaregiverNotification: true },
      });
    }

    console.log('[notifyCaregivers] enviando', messages.length, 'mensajes:', JSON.stringify(messages));

    if (messages.length > 0) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json();
      console.log('[notifyCaregivers] respuesta Expo Push:', JSON.stringify(result));
    }
  } catch (error) {
    console.error('Error notificando a cuidadores:', error);
  }
};
