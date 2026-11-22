/**
 * Module 3 - AI Career Prediction & Guidance
 *
 * Career -> required-skills taxonomy.
 *
 * Keys MUST exactly match the 12 target classes the ML model was trained on
 * (see ml-service/models/metadata.json -> dataset.classes), so a prediction
 * from the model can be looked up directly here.
 *
 * Skills within each array are ordered foundational -> advanced; this order
 * is reused as the default learning priority when a skill gap roadmap is
 * generated (backend/utils/roadmapGenerator.js).
 */

const CAREER_SKILLS_MAP = {
  'Applications Developer': [
    'Programming Fundamentals',
    'Object-Oriented Programming',
    'DBMS',
    'SQL',
    'Git & Version Control',
    'REST APIs',
    'Software Testing',
  ],
  'CRM Technical Developer': [
    'Programming Fundamentals',
    'SQL',
    'API Integration',
    'Business Process Analysis',
    'Cloud Computing',
    'Git & Version Control',
  ],
  'Database Developer': [
    'SQL',
    'DBMS',
    'Database Design',
    'Indexing & Query Optimization',
    'NoSQL Databases',
    'Data Modeling',
  ],
  'Mobile Applications Developer': [
    'Programming Fundamentals',
    'Object-Oriented Programming',
    'Mobile UI Design',
    'REST APIs',
    'Git & Version Control',
    'App Deployment',
  ],
  'Network Security Engineer': [
    'Networking Fundamentals',
    'Operating Systems',
    'Network Security',
    'Firewalls & VPNs',
    'Cryptography',
    'Risk Assessment',
  ],
  'Software Developer': [
    'Programming Fundamentals',
    'Data Structures & Algorithms',
    'Object-Oriented Programming',
    'DBMS',
    'SQL',
    'Git & Version Control',
    'System Design',
  ],
  'Software Engineer': [
    'Programming Fundamentals',
    'Data Structures & Algorithms',
    'Object-Oriented Programming',
    'DBMS',
    'SQL',
    'Operating Systems',
    'Computer Networks',
    'Git & Version Control',
    'System Design',
  ],
  'Software Quality Assurance (QA) / Testing': [
    'Manual Testing',
    'Test Case Design',
    'SQL',
    'Automation Testing',
    'Bug Tracking',
    'CI/CD Basics',
  ],
  'Systems Security Administrator': [
    'Operating Systems',
    'Networking Fundamentals',
    'Network Security',
    'Identity & Access Management',
    'Security Auditing',
    'Scripting',
    'Incident Response',
  ],
  'Technical Support': [
    'Troubleshooting',
    'Networking Fundamentals',
    'Operating Systems',
    'Customer Communication',
    'Ticketing Systems',
  ],
  'UX Designer': [
    'User Research',
    'Wireframing',
    'Prototyping (Figma)',
    'Visual Design',
    'Interaction Design',
    'Usability Testing',
  ],
  'Web Developer': [
    'HTML & CSS',
    'JavaScript',
    'Frontend Frameworks',
    'REST APIs',
    'Git & Version Control',
    'Responsive Design',
    'Basic Backend Development',
  ],
};

// Flat, de-duplicated list of every skill across all careers.
// Used to render the "current skills" picker in the assessment UI.
const ALL_SKILLS = [...new Set(Object.values(CAREER_SKILLS_MAP).flat())].sort();

module.exports = { CAREER_SKILLS_MAP, ALL_SKILLS };
