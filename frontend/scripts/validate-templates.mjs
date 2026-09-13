import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourcePath = path.resolve('src/data/techPosterTemplates.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: false,
  },
}).outputText;

const tempFile = path.join(os.tmpdir(), `techposter-templates-${Date.now()}.mjs`);
fs.writeFileSync(tempFile, output, 'utf8');

try {
  const module = await import(pathToFileURL(tempFile).href);
  const templates = module.VALID_TECH_POSTER_TEMPLATES;
  const searchText = module.templateSearchText;

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  assert(Array.isArray(templates), 'Template export is not an array');
  assert(templates.length >= 60, `Expected at least 60 valid templates, received ${templates.length}`);

  const ids = new Set();
  for (const template of templates) {
    assert(!ids.has(template.id), `Duplicate template id: ${template.id}`);
    ids.add(template.id);
    assert(template.posterSpec?.cards?.length >= 3, `${template.name} has an invalid PosterSpec`);
    assert(template.width > 0 && template.height > 0, `${template.name} has invalid dimensions`);
    assert(template.themeId, `${template.name} is missing a theme`);
  }

  const search = (query) => templates.filter((template) => searchText(template).includes(query.toLowerCase())).map((template) => template.name);
  const aiResults = search('AI');
  assert(aiResults.includes('Generative AI Explained'), 'AI search should include Generative AI Explained');
  assert(aiResults.includes('AI Engineer Roadmap'), 'AI search should include AI Engineer Roadmap');
  assert(aiResults.includes('AI Agent Workflow'), 'AI search should include AI Agent Workflow');

  const systemResults = search('system design');
  assert(systemResults.includes('System Design Fundamentals'), 'system design search should include System Design Fundamentals');
  assert(systemResults.includes('Microservices Architecture'), 'system design search should include Microservices Architecture');
  assert(systemResults.includes('Database Design Basics'), 'system design search should include Database Design Basics');
  assert(systemResults.includes('Cloud Architecture Overview'), 'system design search should include Cloud Architecture Overview');

  const combined = templates.filter((template) =>
    template.industry.includes('Technology') &&
    template.orientation === 'Portrait' &&
    template.style.includes('Dark') &&
    template.isFree
  );
  assert(combined.length > 0, 'Technology + Portrait + Dark + Free filter returned no templates');

  const categories = templates.reduce((acc, template) => {
    acc[template.category] = (acc[template.category] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ validTemplates: templates.length, categories, aiResults: aiResults.length, systemDesignResults: systemResults.length }, null, 2));
} finally {
  fs.rmSync(tempFile, { force: true });
}
