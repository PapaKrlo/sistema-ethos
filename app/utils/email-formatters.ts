/**
 * Utilidades para formatear datos de correos electrónicos
 * 
 * Este archivo contiene funciones para limpiar y formatear correctamente
 * campos de correo electrónico, especialmente aquellos que contienen
 * caracteres de escape (\") y otros problemas de formato.
 */

/**
 * Limpia una cadena de texto de correo electrónico, eliminando caracteres de escape
 * y formateando correctamente los nombres y direcciones.
 * 
 * @param emailString Cadena de texto que puede contener caracteres de escape
 * @returns Cadena de texto limpia
 */
export function cleanEmailString(emailString: string): string {
  if (!emailString) return '';
  
  // Eliminar caracteres de escape y limpiar formato
  let cleaned = emailString
    .replace(/\\"/g, '"')   // Reemplazar \" por "
    .replace(/\\'/g, "'")   // Reemplazar \' por '
    .replace(/\\n/g, '\n')  // Reemplazar \n por salto de línea real
    .replace(/\\t/g, '\t')  // Reemplazar \t por tabulación real
    .replace(/\\\\r/g, '\r'); // Reemplazar \\r por retorno de carro real
    
  // Eliminar marcadores de cita de forma más exhaustiva
  cleaned = cleaned
    .replace(/^[ \t]*>+[ \t]*/gm, '') // Eliminar símbolos '>' al principio de las líneas 
    .replace(/\n[ \t]*>+[ \t]*/g, '\n') // Eliminar '>' en líneas que empiezan con espacios
    .replace(/^From:.*(?:\r?\n(?![ \t]).*)*$/gm, '') // Eliminar cabeceras de correo reenviado
    .replace(/^Sent:.*$/gm, '') // Eliminar líneas "Sent:"
    .replace(/^Date:.*$/gm, '') // Eliminar líneas "Date:"
    .replace(/^Subject:.*$/gm, '') // Eliminar líneas "Subject:"
    .replace(/^To:.*$/gm, '') // Eliminar líneas "To:"
    .replace(/\n{3,}/g, '\n\n') // Reducir múltiples saltos de línea consecutivos
    .replace(/[ \t]{2,}/g, ' ') // Reducir múltiples espacios a uno solo
    .trim(); // Eliminar espacios al inicio y final
    
  return cleaned;
}

/**
 * Extrae el nombre y correo electrónico de una cadena con formato de remitente/destinatario
 * 
 * @param emailField Cadena con formato "Nombre Apellido" <email@ejemplo.com>
 * @returns Objeto con nombre y email extraídos
 */
export function parseEmailAddress(emailField: string): { name: string; email: string } {
  if (!emailField) return { name: '', email: '' };
  
  // Primero limpiar caracteres de escape
  const cleanedField = cleanEmailString(emailField);
  
  // Patrón para extraer nombre y email: "Nombre Apellido" <email@ejemplo.com>
  const match = cleanedField.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
  
  if (match) {
    const name = match[1]?.trim() || '';
    const email = match[2]?.trim() || '';
    return { name, email };
  }
  
  // Si no hay coincidencia con el patrón, devolver la cadena completa como nombre
  return { name: cleanedField, email: '' };
}

/**
 * Formatea una lista de destinatarios (separados por comas)
 * 
 * @param recipients Cadena de texto con múltiples destinatarios
 * @returns Lista de objetos con nombre y email
 */
export function parseRecipientsList(recipients: string): Array<{ name: string; email: string }> {
  if (!recipients) return [];
  
  // Limpiar la cadena de caracteres de escape
  const cleanedRecipients = cleanEmailString(recipients);
  
  // Dividir por comas, pero teniendo cuidado con las comas dentro de comillas
  const recipientsList = cleanedRecipients.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  
  // Procesar cada destinatario
  return recipientsList.map(recipient => parseEmailAddress(recipient.trim()));
}

/**
 * Extrae iniciales de un nombre para usar en avatares
 * 
 * @param name Nombre completo
 * @returns Iniciales (máximo 2 caracteres)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const cleanName = cleanEmailString(name);
  const parts = cleanName.split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formatea el tamaño de un archivo a una unidad legible (KB, MB, etc.)
 * 
 * @param bytes Tamaño en bytes
 * @returns Cadena formateada con unidad
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 