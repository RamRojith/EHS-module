import type { IncidentType, NearMissCategory, InspectionCategory, PpeItem, TrainingCategory } from './types';

/** Frozen "today" for the demo so every figure is reproducible. */
export const DEMO_TODAY = new Date(2026, 8, 29); // 29-Sep-2026

export const MONTHS = [
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
  '2026-06', '2026-07', '2026-08', '2026-09',
] as const;

export type MonthKey = (typeof MONTHS)[number];

export const MONTH_LABELS: Record<MonthKey, string> = {
  '2026-01': 'Jan', '2026-02': 'Feb', '2026-03': 'Mar', '2026-04': 'Apr',
  '2026-05': 'May', '2026-06': 'Jun', '2026-07': 'Jul', '2026-08': 'Aug',
  '2026-09': 'Sep',
};

export const MONTH_LABELS_LONG: Record<MonthKey, string> = {
  '2026-01': 'January', '2026-02': 'February', '2026-03': 'March', '2026-04': 'April',
  '2026-05': 'May', '2026-06': 'June', '2026-07': 'July', '2026-08': 'August',
  '2026-09': 'September',
};

/* -------------------------------------------------------------------------- */
/*                            UNIT CONFIGURATION                              */
/* -------------------------------------------------------------------------- */

export interface UnitSeed {
  code: string;
  name: string;
  shortName: string;
  description: string;
  location: string;
  state: string;
  headcount: number;
  departments: string[];
  safetyHead: string;
  established: string;
  /** weighted monthly work-hour shape used by the man-hour model */
  hoursPerEmployeeMonth: number;
  trainingBase: number; // 0..1
  ppeBase: number; // 0..1
  /** record volumes across Jan–Sep 2026 */
  volumes: {
    incidents: number;
    lostTime: number;
    fire: number;
    nearMisses: number;
    observations: number;
    inspections: number;
  };
  /** relative share of unsafe-act / unsafe-condition findings */
  actBias: number;
  riskAreas: string[];
  seedSalt: string;
}

export const UNIT_SEEDS: UnitSeed[] = [
  {
    code: 'RML',
    name: 'Ring Spinning Mill – A',
    shortName: 'Ring Spinning Mill A',
    description: 'Largest ring spinning block with 42 auto-cone ring frames and high ring-frame man-hours.',
    location: 'Mill Campus – Block 1',
    state: 'Tamil Nadu',
    headcount: 186,
    departments: ['Spinning', 'Ring Frame', 'Winding', 'Carding', 'Maintenance', 'Quality', 'Safety'],
    safetyHead: 'S. Balasubramanian',
    established: '1998',
    hoursPerEmployeeMonth: 218,
    trainingBase: 0.975,
    ppeBase: 0.985,
    volumes: { incidents: 24, lostTime: 2, fire: 1, nearMisses: 15, observations: 18, inspections: 6 },
    actBias: 0.55,
    riskAreas: ['Ring Frame Shed – Bay 1', 'Winding Section', 'Carding Hall', 'Compressor Room', 'Material Store', 'Yard'],
    seedSalt: 'rml',
  },
  {
    code: 'RST',
    name: 'Ring Spinning Mill – B',
    shortName: 'Ring Spinning Mill B',
    description: 'Second ring spinning block running 3-shift operations with an in-house skill development centre.',
    location: 'Mill Campus – Block 2',
    state: 'Tamil Nadu',
    headcount: 164,
    departments: ['Spinning', 'Ring Frame', 'Winding', 'Maintenance', 'Quality', 'Admin'],
    safetyHead: 'R. Venkatesan',
    established: '2006',
    hoursPerEmployeeMonth: 214,
    trainingBase: 0.968,
    ppeBase: 0.978,
    volumes: { incidents: 19, lostTime: 2, fire: 0, nearMisses: 12, observations: 16, inspections: 5 },
    actBias: 0.5,
    riskAreas: ['Ring Frame Shed – Bay 2', 'Doffer Area', 'Utility Room', 'Training Centre', 'Weighing Bridge'],
    seedSalt: 'rst',
  },
  {
    code: 'RMU',
    name: 'Ring Mill – Utilities & Maintenance',
    shortName: 'Ring Mill Utilities',
    description: 'Central utilities, ETP, boiler house and maintenance — highest electrical and work-at-height exposure.',
    location: 'Utility Block – North',
    state: 'Tamil Nadu',
    headcount: 118,
    departments: ['Utilities', 'Electrical', 'Boiler House', 'Maintenance', 'ETP', 'Safety'],
    safetyHead: 'M. Karthikeyan',
    established: '1998',
    hoursPerEmployeeMonth: 208,
    trainingBase: 0.951,
    ppeBase: 0.958,
    volumes: { incidents: 22, lostTime: 2, fire: 1, nearMisses: 13, observations: 15, inspections: 6 },
    actBias: 0.62,
    riskAreas: ['Boiler House', 'HT Panel Room', 'ETP Aeration Tank', 'Chiller Plant', 'Overhead Pipe Rack', 'Transformer Yard'],
    seedSalt: 'rmu',
  },
  {
    code: 'RMF',
    name: 'Ring Mill – Finishing & Packing',
    shortName: 'Ring Mill Finishing',
    description: 'Baling, packing, labelling and dispatch operations with high manual-material-handling load.',
    location: 'Finishing Block – East',
    state: 'Tamil Nadu',
    headcount: 96,
    departments: ['Baling', 'Packing', 'Dispatch', 'Maintenance', 'Quality'],
    safetyHead: 'A. Priyadharshini',
    established: '2009',
    hoursPerEmployeeMonth: 212,
    trainingBase: 0.961,
    ppeBase: 0.975,
    volumes: { incidents: 14, lostTime: 0, fire: 1, nearMisses: 9, observations: 10, inspections: 5 },
    actBias: 0.58,
    riskAreas: ['Baling Hall', 'Packing Line 1', 'Dispatch Yard', 'LPG Bank', 'Godown – RM'],
    seedSalt: 'rmf',
  },
  {
    code: 'SAN',
    name: 'Spinning & Allied Department',
    shortName: 'Spinning & Allied',
    description: 'Roving, lap and preparatory section feeding the spinning blocks, with heavy forklift movement.',
    location: 'Allied Block – South',
    state: 'Tamil Nadu',
    headcount: 142,
    departments: ['Roving', 'Carding', 'Drawing', 'Preparation', 'Maintenance', 'Safety'],
    safetyHead: 'K. Dhanasekaran',
    established: '2001',
    hoursPerEmployeeMonth: 216,
    trainingBase: 0.966,
    ppeBase: 0.970,
    volumes: { incidents: 18, lostTime: 1, fire: 0, nearMisses: 11, observations: 15, inspections: 5 },
    actBias: 0.54,
    riskAreas: ['Roving Hall', 'Lap Room', 'Drawing Section', 'Forklift Route', 'Autoconer Cleaning Area'],
    seedSalt: 'san',
  },
  {
    code: 'SRS',
    name: 'Synthetic Ring Spinning',
    shortName: 'Synthetic Ring Spinning',
    description: 'Newer synthetic yarn line with modern guarding; lower headcount, higher training and PPE maturity.',
    location: 'New Block – Sector 4',
    state: 'Tamil Nadu',
    headcount: 88,
    departments: ['Spinning', 'Winding', 'Maintenance', 'Quality'],
    safetyHead: 'N. Meenakshi',
    established: '2017',
    hoursPerEmployeeMonth: 210,
    trainingBase: 0.989,
    ppeBase: 0.995,
    volumes: { incidents: 12, lostTime: 0, fire: 0, nearMisses: 8, observations: 9, inspections: 4 },
    actBias: 0.42,
    riskAreas: ['Synthetic Spinning Hall', 'Open-End Winding', 'Robot Packing Cell', 'Chiller Corridor'],
    seedSalt: 'srs',
  },
  {
    code: 'SVSM',
    name: 'Site Services, Vending & Maintenance',
    shortName: 'Site Services',
    description: 'Housekeeping, canteen, security, sanitation and estate maintenance support functions.',
    location: 'Service Block – Campus',
    state: 'Tamil Nadu',
    headcount: 74,
    departments: ['Housekeeping', 'Canteen', 'Security', 'Maintenance', 'Safety'],
    safetyHead: 'P. Ramamoorthy',
    established: '2004',
    hoursPerEmployeeMonth: 198,
    trainingBase: 0.947,
    ppeBase: 0.952,
    volumes: { incidents: 10, lostTime: 0, fire: 0, nearMisses: 7, observations: 8, inspections: 4 },
    actBias: 0.46,
    riskAreas: ['Canteen Kitchen', 'Security Cabin', 'Housekeeping Store', 'Drainage Lines', 'Landscaping Area'],
    seedSalt: 'svsm',
  },
  {
    code: 'RTL-S',
    name: 'Retail & Logistics – South',
    shortName: 'Retail & Logistics South',
    description: 'Regional retail outlets, warehousing and last-mile logistics with fleet and road-safety exposure.',
    location: 'Regional Office – South',
    state: 'Karnataka',
    headcount: 132,
    departments: ['Warehouse', 'Transport', 'Retail', 'Field Sales', 'Safety'],
    safetyHead: 'T. Srinivasan',
    established: '2012',
    hoursPerEmployeeMonth: 205,
    trainingBase: 0.939,
    ppeBase: 0.946,
    volumes: { incidents: 16, lostTime: 2, fire: 0, nearMisses: 10, observations: 13, inspections: 5 },
    actBias: 0.66,
    riskAreas: ['Regional Godown', 'Loading Bay', 'Transport Yard', 'Retail Store – A', 'Retail Store – B', 'NH-48 Route'],
    seedSalt: 'rtls',
  },
];

/* -------------------------------------------------------------------------- */
/*                              NAME / TEXT POOLS                              */
/* -------------------------------------------------------------------------- */

export const FIRST_NAMES = [
  'Ramesh', 'Suresh', 'Anand', 'Priya', 'Kavitha', 'Mohan', 'Lakshmi', 'Venkat', 'Meena', 'Raju',
  'Selvam', 'Deepa', 'Arun', 'Nandhini', 'Ganesh', 'Sathish', 'Revathi', 'Muthu', 'Kumari', 'Bala',
  'Jagan', 'Anitha', 'Prakash', 'Sarala', 'Vinod', 'Hemalatha', 'Naveen', 'Shanthi', 'Ravi', 'Deepak',
  'Suresh Kumar', 'Murali', 'Kalpana', 'Sathish Kumar', 'Indira', 'Ajith', 'Poornima', 'Senthil', 'Bhavani', 'Ramesh',
  'Gopal', 'Vasanthi', 'Manivannan', 'Thangam', 'Saravanan', 'Yuvarani', 'Dinesh', 'Padma', 'Krishnan', 'Shobana',
  'Ashok', 'Nagalakshmi', 'Selvaraj', 'Ranjani', 'Perumal', 'Vijaya', 'Chandrasekar', 'Amudha', 'Sivakumar', 'Rathna',
  'Thirumurugan', 'Kausalya', 'Veeraraghavan', 'Oviya', 'Karthikeyan', 'Sridevi', 'Balaji', 'Nithya', 'Anandhan', 'Mallika',
];

export const LAST_NAMES = [
  'Kumar', 'Rajan', 'Sundaram', 'Chandran', 'Mohan', 'Krishnan', 'Perumal', 'Samy', 'Lakshmi', 'Selvakumar',
  'Natarajan', 'Subramanian', 'Palani', 'Sankaran', 'Anand', 'Ravi', 'Bose', 'Iyer', 'Ganesan', 'Thangaraj',
  'Velmurugan', 'Sivakumar', 'Chinnappa', 'Manickam', 'Ayyangar', 'Deshpande', 'Naidu', 'Shetty', 'Menon', 'Pillai',
];

export const SAFETY_OFFICER_NAMES = [
  'V. Anantharaman', 'J. Sivaraman', 'R. Nandhini', 'M. Kalidas', 'S. Pushparaj', 'A. Fathima',
  'K. Ravikumar', 'P. Latha', 'D. Senthilkumar', 'N. Umamaheshwari',
];

export const DESIGNATIONS_BY_DEPT: Record<string, string[]> = {
  Spinning: ['Spinning Technician', 'Shift Supervisor', 'Doffer', 'Ring Frame Operator', 'Trainee Operator'],
  'Ring Frame': ['Ring Frame Operator', 'Doffer', 'Creel Attendant', 'Shift Supervisor', 'Auto Cleaner'],
  Winding: ['Winder Operator', 'Bobbin Attendant', 'Autoconer Operator', 'Shift Supervisor'],
  Carding: ['Carding Operator', 'Feed Attendant', 'Sliver Attendant', 'Shift Supervisor'],
  Roving: ['Roving Operator', 'Roving Carrier', 'Shift Supervisor'],
  Drawing: ['Drawing Operator', 'Sliver Feeder', 'Shift Supervisor'],
  Preparation: ['Lap Machine Operator', 'Roving Operator', 'Helper'],
  Baling: ['Baling Operator', 'Bale Handler', 'Press Operator'],
  Packing: ['Packing Executive', 'Packing Helper', 'Labeling Operator'],
  Dispatch: ['Dispatch Executive', 'Loader', 'Tally Supervisor'],
  Maintenance: ['Maintenance Technician', 'Fitter', 'Electrician', 'Welder', 'Multi Skilled Technician'],
  Electrical: ['Electrician', 'HT Technician', 'Panel Technician'],
  Utilities: ['Utility Operator', 'Boiler Attendant', 'Compressor Operator'],
  'Boiler House': ['Boiler Attendant', 'Fireman', 'Helper'],
  ETP: ['ETP Operator', 'Lab Technician', 'Helper'],
  Quality: ['Quality Inspector', 'Lab Technician', 'QA Executive'],
  Safety: ['Safety Officer', 'Safety Supervisor', 'Fire Marshal', 'Safety Inspector'],
  Admin: ['Admin Executive', 'HR Executive', 'Accounts Executive'],
  Housekeeping: ['Housekeeping Supervisor', 'Cleaner', 'Waste Handler'],
  Canteen: ['Canteen Supervisor', 'Cook', 'Helper'],
  Security: ['Security Guard', 'Security Supervisor'],
  Warehouse: ['Warehouse Executive', 'Store Keeper', 'Helper'],
  Transport: ['Transport Driver', 'Loader', 'Dispatcher'],
  Retail: ['Retail Store Manager', 'Sales Executive'],
  'Field Sales': ['Field Sales Executive', 'Sales Officer'],
};

export const INCIDENT_TYPES: IncidentType[] = [
  'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Near Miss',
  'Property Damage', 'Fire Incident', 'Unsafe Condition', 'Unsafe Act',
];

export const NEAR_MISS_CATEGORIES: NearMissCategory[] = [
  'Machine Safety', 'Electrical', 'Fire', 'PPE', 'Material Handling',
  'Working at Height', 'Housekeeping', 'Chemical', 'Ergonomics',
];

export const INSPECTION_CATEGORIES: InspectionCategory[] = [
  'Machine Safety', 'Fire Safety', 'Electrical Safety', 'Housekeeping',
  'PPE', 'Emergency Exit', 'Chemical Storage', 'Workplace Safety',
];

export const PPE_ITEMS: PpeItem[] = [
  'Helmet', 'Safety Shoes', 'Gloves', 'Safety Goggles', 'Ear Protection',
  'Respiratory Protection', 'Safety Harness',
];

export const PPE_DIFFICULTY: Record<PpeItem, number> = {
  Helmet: 0.998,
  'Safety Shoes': 0.992,
  Gloves: 0.985,
  'Safety Goggles': 0.975,
  'Ear Protection': 0.962,
  'Respiratory Protection': 0.952,
  'Safety Harness': 0.938,
};

export const TRAINING_CATEGORIES: TrainingCategory[] = [
  'Fire Safety', 'PPE', 'Machine Safety', 'Electrical Safety', 'First Aid',
  'Emergency Response', 'Chemical Safety', 'Working at Height', 'Occupational Health & Safety',
];

/** Category difficulty multiplier applied on top of the unit training base. */
export const TRAINING_CATEGORY_FACTOR: Record<TrainingCategory, number> = {
  'Fire Safety': 1.03,
  PPE: 1.05,
  'Machine Safety': 0.985,
  'Electrical Safety': 0.95,
  'First Aid': 0.955,
  'Emergency Response': 0.97,
  'Chemical Safety': 0.94,
  'Working at Height': 0.925,
  'Occupational Health & Safety': 1.02,
};

export const TRAINING_LIBRARY: {
  code: string; title: string; category: TrainingCategory; durationHours: number;
  validityMonths: number; mode: 'Classroom' | 'On-the-Job' | 'E-Learning' | 'External';
  mandatory: boolean; trainer: string; passMark: number;
}[] = [
  { code: 'TRN-FS-01', title: 'Fire Safety & Fire Fighting', category: 'Fire Safety', durationHours: 6, validityMonths: 12, mode: 'Classroom', mandatory: true, trainer: 'N. Umamaheshwari', passMark: 75 },
  { code: 'TRN-PPE-01', title: 'PPE Selection, Use & Care', category: 'PPE', durationHours: 3, validityMonths: 24, mode: 'On-the-Job', mandatory: true, trainer: 'V. Anantharaman', passMark: 70 },
  { code: 'TRN-MS-01', title: 'Machine Safety & Guarding', category: 'Machine Safety', durationHours: 8, validityMonths: 12, mode: 'On-the-Job', mandatory: true, trainer: 'J. Sivaraman', passMark: 80 },
  { code: 'TRN-ES-01', title: 'Electrical Safety & Arc Flash', category: 'Electrical Safety', durationHours: 8, validityMonths: 12, mode: 'Classroom', mandatory: true, trainer: 'M. Kalidas', passMark: 85 },
  { code: 'TRN-FA-01', title: 'First Aid & CPR', category: 'First Aid', durationHours: 12, validityMonths: 24, mode: 'External', mandatory: true, trainer: 'S. Pushparaj', passMark: 75 },
  { code: 'TRN-ER-01', title: 'Emergency Response & Evacuation', category: 'Emergency Response', durationHours: 4, validityMonths: 12, mode: 'Classroom', mandatory: true, trainer: 'A. Fathima', passMark: 70 },
  { code: 'TRN-CS-01', title: 'Chemical Handling & COSHH', category: 'Chemical Safety', durationHours: 5, validityMonths: 12, mode: 'Classroom', mandatory: true, trainer: 'K. Ravikumar', passMark: 75 },
  { code: 'TRN-WAH-01', title: 'Working at Height / Scaffolding', category: 'Working at Height', durationHours: 6, validityMonths: 12, mode: 'On-the-Job', mandatory: true, trainer: 'P. Latha', passMark: 80 },
  { code: 'TRN-OHS-01', title: 'Occupational Health & Hygiene', category: 'Occupational Health & Safety', durationHours: 4, validityMonths: 24, mode: 'E-Learning', mandatory: true, trainer: 'D. Senthilkumar', passMark: 65 },
];

export const INSPECTOR_NAMES = [
  'V. Anantharaman', 'J. Sivaraman', 'R. Nandhini', 'M. Kalidas', 'S. Pushparaj',
  'A. Fathima', 'K. Ravikumar', 'P. Latha', 'D. Senthilkumar', 'N. Umamaheshwari',
];

export const WARDEN_NAMES = [
  'S. Balasubramanian', 'R. Venkatesan', 'M. Karthikeyan', 'A. Priyadharshini',
  'K. Dhanasekaran', 'N. Meenakshi', 'P. Ramamoorthy', 'T. Srinivasan',
];

/* ----------------------------- DESCRIPTION POOLS --------------------------- */

export const INCIDENT_NARRATIVE: Record<IncidentType, string[]> = {
  'First Aid': [
    'Minor cut to left palm while clearing a bobbin chucker; on-the-spot first aid dressing applied by shift first aider.',
    'Splinter / abrasion on forearm while manually handling raw cotton bales; antiseptic applied and area barricaded.',
    'Small foreign-body injury to eye from lint fibre; flushed at the first-aid station, no further treatment required.',
    'Bruise on forearm from accidental contact with a baling press handle; dressed and worker advised on guarding interlock.',
  ],
  'Medical Treatment': [
    'Worker sustained a sprain while stepping off a platform; referred to the company medical centre and put on light duty for 3 days.',
    'Deep abrasion on shin from a protruding bracket; sutured at the medical centre, 4 days of restricted duty prescribed.',
    'Lower back strain reported after prolonged manual lifting at the godown; medical assessment provided, medication issued.',
    'Crush injury to right thumb between bale and trolley; treated at hospital, classified as a recordable case.',
  ],
  'Lost Time Injury': [
    'Worker caught in a ring-frame doffer mechanism while clearing a broken ring; serious laceration and fracture, currently off duty for medical treatment.',
    'Fall from an unsecured access ladder in the boiler house resulting in a compound fracture; under medical investigation.',
    'Hand entangled in a live mixing valve during ETP sludge transfer; severe burn injury with extended absence from work.',
    'Machine entanglement at the autoconer while clearing a thread break, resulting in partial amputation of two fingers.',
    'Slip on an oil-contaminated floor near the compressor room, leading to a pelvic fracture and prolonged absence.',
  ],
  'Near Miss': [
    'Ring frame guard interlock was bypassed with a clamp to keep the line running; no injury occurred at this instant.',
    'Unsecured 200 kg bale fell from a stacking rack without striking any person in the adjacent walkway.',
    'Overhead pipe lagging fell near the technician who had just moved aside; potential head-strike hazard.',
    'Forklift reversed towards an operator who stepped aside at the last moment; no contact occurred.',
    'An energised 415 V panel cover was found removed and terminals exposed during a routine walk-through.',
  ],
  'Property Damage': [
    'Spinning frame drive belt failed, causing a ₹3.2 lakh loss to the machine and adjacent electrical panel.',
    'Bale loader collision with a godown pillar damaged the hydraulic arm and the bay shutter.',
    'Water ingress from a chiller line burst damaged stored raw material bales in the godown.',
    'Forklift impact with a finished-goods stack, damaging packaging and product.',
  ],
  'Fire Incident': [
    'Minor fire started from a hot surface in the LPG bank; extinguished by the fire crew within 4 minutes, no injuries.',
    'Electrical short-circuit in the panel room produced a flash fire; suppressed by CO₂ system, no casualties.',
    'Lint accumulation in the baling hall self-heated and produced a small smouldering fire, controlled with a fire extinguisher.',
  ],
  'Unsafe Condition': [
    'Damaged safety guard reported on ring frame RF-118 during a routine floor inspection.',
    'Emergency exit route partially blocked by finished-goods pallets, reducing evacuation width.',
    'Damaged handrail identified at the ETP access platform, exposing personnel to a fall hazard.',
    'Leaking compressed-air line observed near the doffer, creating a slip and jet-pressure hazard.',
  ],
  'Unsafe Act': [
    'Worker bypassed the two-hand control on the bale press for the third time this month; supervisor counselling recorded.',
    'Employee observed using a mobile phone on the ring-frame operating floor near moving spindles.',
    'Technician observed climbing a ladder without securing it, in contravention of the work-at-height procedure.',
    'Worker found smoking near the RM material store despite the no-smoking signage; warning issued.',
  ],
};

export const NEAR_MISS_NARRATIVE: Record<NearMissCategory, string[]> = {
  'Machine Safety': [
    'Doffer interlock defeated with a temporary bypass while clearing a repeated doffing fault on the ring frame.',
    'Autoconer thread-break clearing attempted while the machine was still in motion.',
    'Unintended machine start-up experienced during a cleaning operation without lock-out; operator moved clear in time.',
    'Broken guard panel on the draw frame allowing direct contact with the drive belt.',
  ],
  Electrical: [
    'Extension board found connected through an unprotected socket in a wet zone near the chiller pit.',
    'Cable tray overloading observed with multiple temporary extension boards in the maintenance bay.',
    'Locker found without an earth connection; a tester was used to complete the job.',
    'Circuit breaker rated for a lower load than the connected equipment, tripping repeatedly.',
  ],
  Fire: [
    'Fire extinguishers in the ring-frame bay found with expired refill dates (over 2 months past due).',
    'LPG bank hose found without a monthly inspection tag.',
    'Fire alarm call-point in the packing hall found in a non-operational state during a walk-through.',
    'Combustible packaging stored within one metre of an electrical panel.',
  ],
  PPE: [
    'Helper found working on the baling line without cut-resistant gloves.',
    'Welding operation carried out without a welding shield; helper stood inside the arc zone.',
    'Two operators on the ring-frame floor without ear plugs in a high-noise zone (>85 dB).',
    'Rooftop maintenance team found without safety harness lanyards clipped to the anchor point.',
  ],
  'Material Handling': [
    'Bales stacked five high in the godown exceeding the permitted three-high stack limit.',
    'Forklift reversing without a bankman while loading at the dispatch bay.',
    'Manual lifting of a bale exceeding 50 kg without a mechanical aid or team lift.',
    'Pallet truck damaged brake preventing controlled deceleration on the ramp.',
  ],
  'Working at Height': [
    'Open scaffold platform found without a toe board and mid-rail on level 2.',
    'Ladder used for access to a high-voltage panel, not secured at the top.',
    'Rooftop access door found unlocked with no fall-protection signage.',
    'Repair work carried out on an electrical gantry without a permit-to-work.',
  ],
  Housekeeping: [
    'Oil spill of approximately 6 litres near the compressor skid creating a slip hazard for 20 minutes before being controlled.',
    'Cotton lint accumulation above 10 mm on the motor housing of the carding drive.',
    'Obstructed passage with scrap yarn bales in the winding section aisle.',
    'Wet flooring in the canteen wash area with no signage or barricade.',
  ],
  Chemical: [
    'Perchloroethylene drums stored without secondary containment in the chemical store.',
    'Decanting of chemicals performed without an appropriate funnel and eye-wash station nearby.',
    'Safety data sheets not displayed in the ETP chemical lab.',
    'Two different chemicals observed decanted into an unlabelled container.',
  ],
  Ergonomics: [
    'Manual handling of 30 kg bales repeatedly observed in the baling section without a mechanical aid.',
    'Operator working in a permanently twisted posture at the frame piecing station.',
    'Excessive reach distance to the start/stop controls on the draw frame.',
    'Prolonged standing without an anti-fatigue mat at the inspection table.',
  ],
};

export const CAPA_FINDINGS: Record<string, string[]> = {
  Incident: [
    'Re-install the missing safety guard and lock the guard screw; add a pre-shift guard integrity check.',
    'Issue a work permit for all non-routine intervention on the ring frame and audit compliance for 30 days.',
    'Carry out a time-study of the doffing cycle and re-allocate two helpers to reduce the manual reach.',
    'Replace the defective two-hand control on the bale press and validate with a functional test.',
    'Reinforce the emergency stop reachability check at every shift handover.',
  ],
  'Near Miss': [
    'Prohibit bypass of safety interlocks through a locked-out bypass register with management sign-off.',
    'Install an interlock-cut detection alarm on the bypassed guard and review the footage daily.',
    'Redesign the stacking racking in the godown to a two-high limit with bay markers.',
    'Complete a floor-marking and traffic-segregation plan for the forklift route.',
    'Carry out a work-at-height audit and issue personalised harness anchor lanyards to all trade staff.',
  ],
  'Safety Observation': [
    'Conduct a toolbox talk on the identified unsafe act and record attendance for the whole shift.',
    'Install additional PPE vending points closer to the identified work area.',
    'Install adequate illumination at the identified location to remove the dark-zone hazard.',
    'Display visual safety boards and monthly scorecards at the section entrance.',
    'Repair the damaged handrail and repaint the anti-slip marking.',
  ],
  Inspection: [
    'Close all major findings from the inspection report and re-inspect within 15 days.',
    'Provide refresher training to all operators on the machine guarding standard.',
    'Replace all non-serviceable emergency luminaires in the identified block.',
    'Segregate incompatible chemicals in the store and label every container.',
    'Set up a weekly self-inspection register signed by the shift supervisor.',
  ],
  Audit: [
    'Complete a horizontal deployment of the corrective action across all similar installations.',
    'Update the risk assessment register for the identified activity.',
  ],
};

export const ROOT_CAUSES = [
  'Procedural gap — control not defined in the work instruction',
  'Inadequate supervision during the night shift',
  'Training currency lapsed for the involved shift',
  'Interim barricade removed before permanent repair',
  'Machine guarding not included in the preventive maintenance checklist',
  'Fatigue due to extended overtime during the peak season',
  'Contractor induction records not updated after mobilisation',
  'Toolbox talk not repeated after the last process change',
  'Housekeeping schedule not followed during the absenteeism period',
  'Interlock defeat done to avoid repeated production stoppage',
];

export const AREA_PREFIX = ['Bay', 'Line', 'Zone', 'Section'];

export const INJURY_PARTS = [
  'Left hand', 'Right hand', 'Forearm', 'Lower back', 'Left ankle', 'Right knee',
  'Shoulder', 'Finger', 'Head / forehead', 'Foot', 'Chest', 'Wrist',
];
