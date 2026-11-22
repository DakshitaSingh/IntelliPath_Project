/**
 * Module 3 - AI Career Prediction & Guidance
 *
 * Single source of truth mapping a skill name -> curated learning resources.
 * Keeping this centralized (instead of hard-coding links inside React
 * components) means new skills/resources only need to be added here.
 *
 * Each resource: { title, platform, url }
 */

const LEARNING_RESOURCES = {
  'Programming Fundamentals': [
    { title: 'CS50: Introduction to Computer Science', platform: 'Harvard/edX', url: 'https://cs50.harvard.edu/x/' },
    { title: 'Python for Everybody', platform: 'Coursera', url: 'https://www.coursera.org/specializations/python' },
  ],
  'Data Structures & Algorithms': [
    { title: 'Data Structures and Algorithms', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/coding-interview-prep/' },
    { title: 'Algorithms Specialization', platform: 'Coursera (Stanford)', url: 'https://www.coursera.org/specializations/algorithms' },
  ],
  'Object-Oriented Programming': [
    { title: 'Object Oriented Programming in Java', platform: 'Coursera', url: 'https://www.coursera.org/learn/object-oriented-java' },
  ],
  'DBMS': [
    { title: 'Database Management Essentials', platform: 'Coursera', url: 'https://www.coursera.org/learn/database-management' },
  ],
  'SQL': [
    { title: 'SQL for Data Science', platform: 'Coursera', url: 'https://www.coursera.org/learn/sql-for-data-science' },
    { title: 'Learn SQL', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/relational-database/' },
  ],
  'Git & Version Control': [
    { title: 'Git and GitHub for Beginners', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/git-and-github-for-beginners/' },
  ],
  'REST APIs': [
    { title: 'REST API Design', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/rest-api-best-practices-rest-endpoint-design-examples/' },
  ],
  'Software Testing': [
    { title: 'Software Testing and Automation', platform: 'Coursera', url: 'https://www.coursera.org/specializations/software-testing-automation' },
  ],
  'API Integration': [
    { title: 'APIs and Integration Basics', platform: 'MDN', url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs' },
  ],
  'Business Process Analysis': [
    { title: 'Business Process Management', platform: 'Coursera', url: 'https://www.coursera.org/learn/bpm' },
  ],
  'Cloud Computing': [
    { title: 'Cloud Computing Basics', platform: 'Coursera', url: 'https://www.coursera.org/learn/cloud-computing-basics' },
    { title: 'AWS Cloud Practitioner Essentials', platform: 'AWS Skill Builder', url: 'https://skillbuilder.aws/' },
  ],
  'Database Design': [
    { title: 'Database Design Course', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/database-design-course/' },
  ],
  'Indexing & Query Optimization': [
    { title: 'SQL Performance & Indexing', platform: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/' },
  ],
  'NoSQL Databases': [
    { title: 'MongoDB Basics', platform: 'MongoDB University', url: 'https://learn.mongodb.com/' },
  ],
  'Data Modeling': [
    { title: 'Data Modeling Fundamentals', platform: 'Coursera', url: 'https://www.coursera.org/learn/database-management' },
  ],
  'Mobile UI Design': [
    { title: 'Mobile App Design', platform: 'Coursera (Google)', url: 'https://www.coursera.org/professional-certificates/android-developer' },
  ],
  'App Deployment': [
    { title: 'Publishing Mobile Apps', platform: 'Android Developers', url: 'https://developer.android.com/distribute' },
  ],
  'Networking Fundamentals': [
    { title: 'Computer Networking', platform: 'Coursera (Google)', url: 'https://www.coursera.org/learn/computer-networking' },
  ],
  'Operating Systems': [
    { title: 'Operating Systems and You', platform: 'Coursera (Google)', url: 'https://www.coursera.org/learn/os-power-user' },
  ],
  'Network Security': [
    { title: 'Network Security', platform: 'Coursera', url: 'https://www.coursera.org/learn/network-security-database-vulnerabilities' },
  ],
  'Firewalls & VPNs': [
    { title: 'Firewalls and VPN Fundamentals', platform: 'Cisco Networking Academy', url: 'https://www.netacad.com/' },
  ],
  'Cryptography': [
    { title: 'Cryptography I', platform: 'Coursera (Stanford)', url: 'https://www.coursera.org/learn/crypto' },
  ],
  'Risk Assessment': [
    { title: 'Cybersecurity Risk Management', platform: 'Coursera', url: 'https://www.coursera.org/learn/cybersecurity-risk-management' },
  ],
  'Computer Networks': [
    { title: 'Computer Networks', platform: 'Coursera (Google)', url: 'https://www.coursera.org/learn/computer-networking' },
  ],
  'System Design': [
    { title: 'System Design Primer', platform: 'GitHub', url: 'https://github.com/donnemartin/system-design-primer' },
  ],
  'Manual Testing': [
    { title: 'Software Testing Fundamentals', platform: 'Coursera', url: 'https://www.coursera.org/learn/software-testing' },
  ],
  'Test Case Design': [
    { title: 'Test Case Design Techniques', platform: 'Coursera', url: 'https://www.coursera.org/learn/software-testing' },
  ],
  'Automation Testing': [
    { title: 'Selenium WebDriver Automation', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/learn-selenium-testing/' },
  ],
  'Bug Tracking': [
    { title: 'Bug Tracking & Defect Management', platform: 'Coursera', url: 'https://www.coursera.org/learn/software-testing' },
  ],
  'CI/CD Basics': [
    { title: 'CI/CD Fundamentals', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/beginners-guide-to-ci-cd/' },
  ],
  'Identity & Access Management': [
    { title: 'Identity and Access Management', platform: 'Coursera', url: 'https://www.coursera.org/learn/iam-fundamentals' },
  ],
  'Security Auditing': [
    { title: 'IT Security Auditing', platform: 'Coursera', url: 'https://www.coursera.org/learn/security-audit' },
  ],
  'Scripting': [
    { title: 'Bash Scripting Basics', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/bash-scripting-tutorial-linux-shell-script-and-command-line-for-beginners/' },
  ],
  'Incident Response': [
    { title: 'Cybersecurity Incident Response', platform: 'Coursera', url: 'https://www.coursera.org/learn/incident-response' },
  ],
  'Troubleshooting': [
    { title: 'IT Troubleshooting and Customer Support', platform: 'Coursera (Google)', url: 'https://www.coursera.org/professional-certificates/google-it-support' },
  ],
  'Customer Communication': [
    { title: 'Technical Support Communication Skills', platform: 'Coursera', url: 'https://www.coursera.org/learn/customer-service-fundamentals' },
  ],
  'Ticketing Systems': [
    { title: 'IT Service Management Basics', platform: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-it-support' },
  ],
  'User Research': [
    { title: 'UX Research at Scale', platform: 'Coursera (Google)', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
  ],
  'Wireframing': [
    { title: 'Wireframing and Prototyping', platform: 'Coursera (Google)', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
  ],
  'Prototyping (Figma)': [
    { title: 'Figma for UX Design', platform: 'Figma Learn', url: 'https://help.figma.com/hc/en-us/categories/360002042754-Learn-design-in-Figma' },
  ],
  'Visual Design': [
    { title: 'Visual Design Fundamentals', platform: 'Coursera (CalArts)', url: 'https://www.coursera.org/specializations/graphic-design' },
  ],
  'Interaction Design': [
    { title: 'Interaction Design Specialization', platform: 'Coursera (UCSD)', url: 'https://www.coursera.org/specializations/interaction-design' },
  ],
  'Usability Testing': [
    { title: 'Usability Testing Fundamentals', platform: 'Coursera (Google)', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
  ],
  'HTML & CSS': [
    { title: 'Responsive Web Design', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/' },
  ],
  'JavaScript': [
    { title: 'JavaScript Algorithms and Data Structures', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/' },
  ],
  'Frontend Frameworks': [
    { title: 'Front End Development Libraries (React)', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/' },
  ],
  'Responsive Design': [
    { title: 'Responsive Web Design', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/' },
  ],
  'Basic Backend Development': [
    { title: 'Back End Development and APIs', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/' },
  ],
};

const DEFAULT_RESOURCE = (skill) => [
  { title: `Search: ${skill}`, platform: 'General', url: `https://www.google.com/search?q=learn+${encodeURIComponent(skill)}` },
];

const getResourcesForSkill = (skill) => LEARNING_RESOURCES[skill] || DEFAULT_RESOURCE(skill);

module.exports = { LEARNING_RESOURCES, getResourcesForSkill };
