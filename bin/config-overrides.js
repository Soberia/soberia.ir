module.exports = config => {
  // Injecting Babel config file
  for (const rule of config.module.rules) {
    if ('oneOf' in rule) {
      for (const loader of rule.oneOf) {
        if (loader.include && loader.loader?.includes('babel')) {
          loader.options.babelrc = true;
          break;
        }
      }
    }
  }

  return config;
};
