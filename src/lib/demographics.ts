export interface DemographicResult {
  region: string;
  language: string;
  count?: number;
}

export function guessDemographics(fullName: string): DemographicResult {
  const name = fullName.toLowerCase();

  // South Asia
  if (/(kaur|singh|patel|sharma|gill|sidhu|kumar|gupta|brar|sandhu|garg|dhillon|jain|shah|dass|verma|chowdhury|khan|ahmed)\b/.test(name)) {
    return { region: "South Asia (India/Pakistan)", language: "Hindi / Punjabi / Urdu" };
  }
  // East Asia (China)
  if (/(wang|li\b|zhang|liu|chen|yang|huang|zhao|wu\b|zhou|xu\b|sun\b|ma\b|zhu|hu\b|lin|guo|he\b|gao\b)/.test(name)) {
    return { region: "East Asia (China/Taiwan)", language: "Mandarin / Cantonese" };
  }
  // Middle East (Iran)
  if (/(moradi|hosseini|rezaei|karimi|mohammadi|ahmadi|rahimi|zare|hashemi|safari|alizadeh|ghasemi|shirazi|pour)\b/.test(name)) {
    return { region: "Middle East (Iran)", language: "Persian (Farsi)" };
  }
  // Middle East / Arabic
  if (/(ahmad|ali\b|mohamed|sayed|hassan|ibrahim|khalil|mahmoud|youssef|abdallah|salman)\b/.test(name)) {
    return { region: "Middle East / North Africa", language: "Arabic" };
  }
  // Latin America
  if (/(garcia|martinez|rodriguez|lopez|perez|gonzalez|sanchez|ramirez|torres|flores|rivera|gomez)\b/.test(name)) {
    return { region: "Latin America / Spain", language: "Spanish" };
  }
  // Korea
  if (/(kim\b|lee\b|park\b|choi\b|jung\b|kang\b|cho\b|yoon\b|jang\b|lim\b)/.test(name)) {
    return { region: "East Asia (Korea)", language: "Korean" };
  }
  // Vietnam
  if (/(nguyen|tran\b|le\b|pham\b|huynh|hoang|phan\b|vu\b|dang\b|bui\b)/.test(name)) {
    return { region: "Southeast Asia (Vietnam)", language: "Vietnamese" };
  }
  // Slavic / Russian
  if (/(ivanov|smirnov|kuznetsov|popov|sokolov|fedorov|volkov|novikov|morozov|kozak)\b/.test(name)) {
    return { region: "Eastern Europe", language: "Russian / Slavic" };
  }
  // Philippines
  if (/(santos|reyes|cruz\b|bautista|ocampo|mendoza|aquino)\b/.test(name)) {
    return { region: "Southeast Asia (Philippines)", language: "Tagalog" };
  }

  // Fallback
  return { region: "Other / Mixed / Anglo", language: "English / French / Undetermined" };
}
