const twig = require('twig');
const express = require('express');
const glob = require('glob');
const path = require('path');

// Scan for templates
const hooks = Object.fromEntries(glob.sync('themes/**/pattern-*.html.twig').map(p => {
  const hook = p.match(/^.*\/(.*)\.html\.twig$/)[1];
  return [hook, {
    html: p,
    path: path.dirname(p),
  }];
}));
glob.sync('**/pattern-*.css').map(p => {
  const hook = p.match(/^.*\/(.*)\.css$/)[1];
  if (hooks[hook]) hooks[hook].css = '/' + p;
});
glob.sync('**/pattern-*.js').map(p => {
  const hook = p.match(/^.*\/(.*)\.js$/)[1];
  if (hooks[hook]) hooks[hook].js = '/' + p;
});

// Extend twig filters
twig.extendFilter('t', value => value);

// Extend twig functions
twig.extendFunction('devel_breakpoint', () => {});
twig.extendFunction('attach_library', value => '');
twig.extendFunction('pattern', (pattern, variables) => {
  const hook = 'pattern-' + pattern.replace(/_/g, '-');
  const template = twig.twig({
    path: hooks[hook].html,
    async: false,
  });
  let result = template.render({
    hook,
    context: { getType: () => 'empty' },
    ...hooks[hook],
    ...variables,
  });
  if (hooks[hook].css) result += `<link rel="stylesheet" href="${hooks[hook].css}">`;
  if (hooks[hook].js) result += `<script src="${hooks[hook].js}"></script>`;
  return result;
});
twig.extendFunction('pattern_preview', pattern => {
  const hook = 'pattern-' + pattern.replace(/_/g, '-');
  const template = twig.twig({
    path: hooks[hook].html,
    async: false,
  });
  let result = template.render({
    hook,
    context: { getType: () => 'preview' },
    ...hooks[hook],
  });
  if (hooks[hook].css) result += `<link rel="stylesheet" href="${hooks[hook].css}">`;
  if (hooks[hook].js) result += `<script src="${hooks[hook].js}"></script>`;
  return result;
});

// Initialize Express
const app = express();
app.set('views', __dirname);
app.set('view engine', 'twig');
app.set('twig options', {
  rethrow: true,
});

// Serve static files
app.use(express.static(__dirname + '/'));

// Serve index
app.get('/', (req, res) => {
  res.render('public/index.html.twig');
});

// Serve hooks
app.get('/:hook', (req, res) => {
  const hook = req.params.hook;
  if (hooks[hook]) {
    res.render('public/index.html.twig', {
      hook: req.params.hook,
      context: { getType: () => 'preview' },
      ...hooks[hook],
      ...req.query,
    });
  } else {
    res.status(404);
  }
});

app.listen(3000);
