import type { DesignBrand } from '../types';
import type { DesignTemplate } from './types';

/**
 * PCS Digital (IT services and consulting, Bangalore; "Fueling Your Digital
 * Journey"). Content follows the company's own LinkedIn posts (October 2026):
 * job posts list work mode, engagement, joining, experience and skills, then
 * ask for details with the resume; festival posts are white with the logo on
 * top, a coloured festival title, a navy message and the email + website
 * footer. Colours follow the logo: blue "PCS", orange "Digital". Upload the
 * logo in the editor's Content tab (Brand → Logo); it replaces the name.
 */

const CONTACT = 'contact@pcsdigitaltech.com';
const WEBSITE = 'www.pcsdigitaltech.com';
const BRAND: DesignBrand = { name: 'PCS Digital', primaryColor: '#1659c7', accentColor: '#f26a2e', email: CONTACT, website: WEBSITE };
/** Festival posts lead with the warm orange-red title, blue accents. */
const FESTIVAL_BRAND: DesignBrand = { ...BRAND, primaryColor: '#d9411e', accentColor: '#1659c7' };
const APPLY = `Share your resume: ${CONTACT}`;
const JOB_FORMATS = ['linkedin', 'square', 'story', 'a4'];
const TAGS = ['pcs digital', 'pcs', 'pcsdigital'];

export const PCS_DIGITAL_TEMPLATES: DesignTemplate[] = [
  {
    id: 'ds-pcs-immediate-hiring',
    name: 'PCS Digital · Immediate hiring',
    description: 'Urgent contract roles: work mode, engagement, joining and positions up front, skills as chips.',
    vertical: 'hiring',
    region: 'india',
    category: 'PCS Digital',
    tags: [...TAGS, 'immediate hiring', 'urgent', 'contract', 'remote', 'sap', 'consultant', 'hiring', 'job post'],
    outputs: ['poster', 'video'],
    altFormats: JOB_FORMATS,
    featured: true,
    popularity: 99,
    source: 'starter',
    spec: {
      schema: 'design-spec/v1',
      id: 'pcs-immediate-hiring',
      title: 'Immediate hiring',
      format: 'portrait-4x5',
      theme: 'minimal-light',
      locale: 'en-IN',
      brand: BRAND,
      pages: [{
        id: 'p1',
        layout: 'job-posting',
        variant: 'single',
        slots: {
          eyebrow: 'Immediate hiring',
          title: 'Sr. Consultant: SAP FICA + IS-U | SAP SVC2',
          subtitle: '2 senior consultant positions on a remote contract. Utilities domain preferred.',
          skills: ['SAP FICA', 'SAP IS-U', 'SAP SVC2', 'S/4HANA', 'Utilities domain', 'SIT / UAT'],
          details: [
            { title: 'Work mode', body: 'Remote', icon: 'home' },
            { title: 'Engagement', body: 'Contract', icon: 'briefcase' },
            { title: 'Joining', body: 'Immediate / short notice', icon: 'hourglass' },
            { title: 'Positions', body: '2 Sr. Consultants', icon: 'users' },
          ],
          cta: APPLY,
          tag: '#ImmediateHiring',
        },
        notes: 'PCS Digital is hiring two senior SAP consultants, FICA with IS-U and SVC2, remote contract, immediate joining.',
      }],
    },
  },
  {
    id: 'ds-pcs-role-skills',
    name: 'PCS Digital · Role with skills',
    description: 'One role with location, experience and positions, and the required skills as chips.',
    vertical: 'hiring',
    region: 'india',
    category: 'PCS Digital',
    tags: [...TAGS, 'we are hiring', 'databricks', 'data engineer', 'azure', 'remote', 'hiring', 'job post'],
    outputs: ['poster', 'video'],
    altFormats: JOB_FORMATS,
    featured: true,
    popularity: 98,
    source: 'starter',
    spec: {
      schema: 'design-spec/v1',
      id: 'pcs-role-skills',
      title: 'We’re hiring',
      format: 'portrait-4x5',
      theme: 'minimal-light',
      locale: 'en-IN',
      brand: BRAND,
      pages: [{
        id: 'p1',
        layout: 'job-posting',
        variant: 'single',
        slots: {
          eyebrow: 'We’re hiring',
          title: 'Databricks Engineer',
          subtitle: 'Join our growing team. Strong Azure data engineering expertise needed.',
          skills: ['Databricks architecture', 'Unity Catalog', 'Delta tables', 'Advanced SQL', 'Python', 'Microsoft Azure'],
          details: [
            { title: 'Location', body: 'Remote', icon: 'map-pin' },
            { title: 'Experience', body: '5+ years', icon: 'briefcase' },
            { title: 'Positions', body: '6', icon: 'users' },
            { title: 'Preferred', body: 'Databricks DE Professional', icon: 'certificate' },
          ],
          cta: APPLY,
          tag: '#WeAreHiring',
        },
        notes: 'PCS Digital is hiring six remote Databricks engineers with five or more years of experience.',
      }],
    },
  },
  {
    id: 'ds-pcs-openings',
    name: 'PCS Digital · Current openings',
    description: 'All open roles on one post, each with its key line. Make a copy per platform size.',
    vertical: 'hiring',
    region: 'india',
    category: 'PCS Digital',
    tags: [...TAGS, 'openings', 'vacancies', 'multiple roles', 'hiring', 'job post'],
    outputs: ['poster', 'video'],
    altFormats: JOB_FORMATS,
    popularity: 97,
    source: 'starter',
    spec: {
      schema: 'design-spec/v1',
      id: 'pcs-openings',
      title: 'Current openings',
      format: 'portrait-4x5',
      theme: 'minimal-light',
      locale: 'en-IN',
      brand: BRAND,
      pages: [{
        id: 'p1',
        layout: 'job-posting',
        variant: 'openings',
        slots: {
          eyebrow: 'Current openings',
          title: 'Grow your career with PCS Digital',
          subtitle: 'Remote · Contract and full-time',
          roles: [
            { title: 'Sr. Consultant: SAP FICA + IS-U', body: 'Remote contract · Immediate joining' },
            { title: 'Sr. Consultant: SAP SVC2', body: 'Functional / Technical · Remote contract' },
            { title: 'Databricks Engineer (6 positions)', body: '5+ years · Remote' },
          ],
          cta: APPLY,
          tag: '#Hiring',
        },
      }],
    },
  },
  {
    id: 'ds-pcs-diwali',
    name: 'PCS Digital · Festival wishes',
    description: 'Festival greeting in the PCS Digital style: white card, coloured title, navy message, email and website footer.',
    vertical: 'festival',
    region: 'india',
    season: { months: [10, 11], label: 'Diwali' },
    category: 'PCS Digital',
    tags: [...TAGS, 'festival', 'greeting', 'wishes', 'diwali', 'deepavali', 'linkedin'],
    outputs: ['poster', 'video'],
    altFormats: ['portrait-4x5', 'linkedin', 'story'],
    popularity: 96,
    source: 'starter',
    spec: {
      schema: 'design-spec/v1',
      id: 'pcs-diwali',
      title: 'Happy Diwali',
      format: 'square',
      theme: 'minimal-light',
      locale: 'en-IN',
      brand: FESTIVAL_BRAND,
      pages: [{
        id: 'p1',
        layout: 'festival-greeting',
        variant: 'centered',
        slots: {
          eyebrow: 'Happy',
          title: 'Diwali',
          message: 'May the festival of lights bring wisdom, prosperity and new beginnings to you and your loved ones.',
          sender: 'PCS Digital',
          contact: `${CONTACT} · ${WEBSITE}`,
        },
        notes: 'PCS Digital wishes everyone a very happy Diwali.',
      }],
    },
  },
];
