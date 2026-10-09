import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBusinessProfile, layoutPage, linkedInCaption, usesBusinessProfile, validateDesignSpec } from '../src/index.ts';
import { HIRING_TEMPLATES, PCS_DIGITAL_TEMPLATES, STARTER_TEMPLATES, instantiateTemplate, searchTemplates } from '../src/catalog/index.ts';
import { toCreativeVideo } from '../src/video/index.ts';

const byId = (id: string) => STARTER_TEMPLATES.find((t) => t.id === id)!;
const slots = (id: string, format?: string) => new Set(layoutPage(instantiateTemplate(byId(id), { format, id: 'x' }), 0).map((item) => item.slot));

test('job posts show the role, every key fact, the skills and how to apply in every size', () => {
  for (const template of [...HIRING_TEMPLATES, ...PCS_DIGITAL_TEMPLATES].filter((t) => t.spec.pages[0].layout === 'job-posting')) {
    const page = template.spec.pages[0];
    for (const format of [template.spec.format, ...template.altFormats]) {
      const shown = slots(template.id, format);
      const expected = ['title', 'cta'];
      if (page.variant === 'openings') (page.slots.roles as unknown[]).forEach((_, i) => expected.push(`roles.${i}.title`));
      else (page.slots.details as unknown[]).forEach((_, i) => expected.push(`details.${i}.body`));
      for (const slot of expected) assert.ok(shown.has(slot), `${template.id} [${format}] is missing ${slot}`);
      assert.deepEqual(validateDesignSpec(instantiateTemplate(template, { format, id: 'x' })).warnings, [], `${template.id} [${format}]`);
    }
  }
  // Skills that fit become chips; at the native size all of them fit.
  const native = slots('ds-pcs-role-skills');
  (byId('ds-pcs-role-skills').spec.pages[0].slots.skills as string[]).forEach((_, i) => assert.ok(native.has(`skills.${i}`), `skill ${i}`));
});

test('PCS Digital templates carry the company brand, contact and colours', () => {
  assert.ok(PCS_DIGITAL_TEMPLATES.length >= 4);
  for (const template of PCS_DIGITAL_TEMPLATES) {
    assert.equal(template.spec.brand?.name, 'PCS Digital', template.id);
    assert.match(JSON.stringify(template.spec), /contact@pcsdigitaltech\.com/, template.id);
    assert.match(template.spec.brand?.primaryColor ?? '', /^#[0-9a-f]{6}$/i);
  }
  const ids = searchTemplates(STARTER_TEMPLATES, 'pcs digital').map((t) => t.id);
  for (const template of PCS_DIGITAL_TEMPLATES) assert.ok(ids.includes(template.id));
  // The brand colour reaches the canvas: the apply bar is PCS blue.
  const bar = layoutPage(byId('ds-pcs-role-skills').spec, 0).find((item) => item.role === 'cta-bar');
  assert.ok(bar && bar.type === 'rect' && bar.fill === '#1659c7');
});

test('LinkedIn captions follow the job-post structure', () => {
  const caption = linkedInCaption(byId('ds-pcs-role-skills').spec);
  const lines = caption.split('\n');
  assert.equal(lines[0], '🚀 We’re hiring: Databricks Engineer');
  assert.ok(lines.includes('📍 Location: Remote') && lines.includes('💼 Experience: 5+ years'));
  assert.ok(lines.includes('✅ Unity Catalog'));
  assert.ok(lines.includes('• Updated resume'));
  assert.ok(lines.includes('👉 Share your resume: contact@pcsdigitaltech.com'));
  const tags = lines.at(-1)!.split(' ');
  assert.ok(tags.includes('#WeAreHiring') && tags.includes('#PCSDigital') && tags.includes('#Hiring'));
  assert.equal(new Set(tags.map((t) => t.toLowerCase())).size, tags.length, 'no duplicate hashtags');

  assert.ok(linkedInCaption(byId('ds-pcs-immediate-hiring').spec).startsWith('🚨 IMMEDIATE HIRING: Sr. Consultant'));
  const openings = linkedInCaption(byId('ds-pcs-openings').spec);
  assert.ok(openings.includes('🔹 1. Sr. Consultant: SAP FICA + IS-U (Remote contract · Immediate joining)'));
  assert.ok(!linkedInCaption(byId('ds-pcs-role-skills').spec, { applicantDetails: [] }).includes('Please share'));
  assert.ok(linkedInCaption(byId('ds-pcs-diwali').spec).includes('🌸 PCS Digital wishes everyone a very Happy Diwali!'));
});

test('saved business details brand job posts', () => {
  const spec = byId('ds-hire-single-role').spec;
  assert.ok(usesBusinessProfile(spec));
  assert.equal(applyBusinessProfile(spec, { name: 'PCS Digital' }).brand?.name, 'PCS Digital');
  assert.ok(!usesBusinessProfile(byId('ds-deck-http-lesson').spec));
});

test('job posts become promotion videos with the role up front', () => {
  const video = toCreativeVideo(byId('ds-pcs-immediate-hiring').spec);
  assert.equal(video.purpose, 'promotion');
  assert.equal(video.scenes[0].type, 'title');
  assert.equal(video.brand.name, 'PCS Digital');
  assert.ok(video.scenes.some((scene) => scene.type === 'slide' && scene.title === 'Apply now' || scene.type === 'slide' && scene.title === '#ImmediateHiring'));
});
