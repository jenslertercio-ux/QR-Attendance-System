export interface StudentData {
  id: string;
  name: string;
  section: string;
  needsManualInfo?: boolean;
}

export function parseQRCode(decodedText: string, defaultSection: string = 'WMAD 1-1'): StudentData | null {
  console.log('Attempting to parse QR code:', decodedText);
  
  // Method 1: Standard format (studentId:studentName:section)
  if (decodedText.includes(':')) {
    const parts = decodedText.split(':');
    if (parts.length >= 2) {
      console.log('Parsed using colon-separated format:', parts);
      return {
        id: parts[0].trim(),
        name: parts[1].trim(),
        section: parts[2] ? parts[2].trim() : defaultSection
      };
    }
  }
  
  // Method 2: Pipe separated (studentId|studentName|section)
  if (decodedText.includes('|')) {
    const parts = decodedText.split('|');
    if (parts.length >= 2) {
      console.log('Parsed using pipe-separated format:', parts);
      return {
        id: parts[0].trim(),
        name: parts[1].trim(),
        section: parts[2] ? parts[2].trim() : defaultSection
      };
    }
  }
  
  // Method 3: Comma separated (studentId,studentName,section)
  if (decodedText.includes(',')) {
    const parts = decodedText.split(',');
    if (parts.length >= 2) {
      console.log('Parsed using comma-separated format:', parts);
      return {
        id: parts[0].trim(),
        name: parts[1].trim(),
        section: parts[2] ? parts[2].trim() : defaultSection
      };
    }
  }
  
  // Method 4: JSON format
  if (decodedText.startsWith('{') || decodedText.startsWith('[')) {
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id || parsed.studentId || parsed.student_id) {
        console.log('Parsed using JSON format:', parsed);
        return {
          id: parsed.id || parsed.studentId || parsed.student_id,
          name: parsed.name || parsed.studentName || parsed.student_name || 'Unknown',
          section: parsed.section || parsed.sectionName || parsed.section_name || defaultSection
        };
      }
    } catch (e) {
      console.log('Invalid JSON format');
    }
  }
  
  // Method 5: URL format with parameters
  if (decodedText.includes('?') && decodedText.includes('=')) {
    try {
      const url = new URL(decodedText);
      const params = new URLSearchParams(url.search);
      const id = params.get('id') || params.get('studentId') || params.get('student_id');
      const name = params.get('name') || params.get('studentName') || params.get('student_name');
      const section = params.get('section') || params.get('sectionName') || params.get('section_name');
      
      if (id) {
        console.log('Parsed using URL format:', { id, name, section });
        return {
          id: id,
          name: name || 'Unknown',
          section: section || defaultSection,
          needsManualInfo: !name
        };
      }
    } catch (e) {
      console.log('Invalid URL format');
    }
  }
  
  // Method 6: Just student ID (common for school IDs)
  if (decodedText.length > 0 && decodedText.length < 50 && !decodedText.includes(' ')) {
    console.log('Parsed as student ID only:', decodedText);
    return {
      id: decodedText.trim(),
      name: 'Unknown',
      section: defaultSection,
      needsManualInfo: true
    };
  }
  
  // Method 7: Try to extract ID from common patterns
  const idPatterns = [
    /ID[:\s]+([A-Z0-9]+)/i,
    /STUDENT[:\s]+([A-Z0-9]+)/i,
    /(\d{4,})/, // 4+ digits
    /([A-Z]{2,}\d{2,})/i // Letters + numbers
  ];
  
  for (const pattern of idPatterns) {
    const match = decodedText.match(pattern);
    if (match) {
      console.log('Parsed using pattern matching:', match[1]);
      return {
        id: match[1],
        name: 'Unknown',
        section: defaultSection,
        needsManualInfo: true
      };
    }
  }
  
  console.log('Could not parse QR code with any method');
  return null;
}
