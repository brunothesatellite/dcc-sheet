window.PortraitSources = [
  window.DCCIcons,
  window.DDRedBoxIcons,
  window.ShadowIcons,
  window.ShadowDarkIcons,
  window.ComicsIcons,
  window.GonzoIcons,
  window.OSRIcons,
].filter(Boolean);

window.getPortraitSrc = function (source, cls, index) {
  var src = '';
  var resolvedSource = source || 'dcc';
  var resolvedIndex = parseInt(index, 10) || 0;

  for (var i = 0; i < window.PortraitSources.length; i++) {
    var ps = window.PortraitSources[i];
    if (ps.meta && ps.meta.key === resolvedSource) {
      var entry = ps[cls];
      if (Array.isArray(entry)) {
        if (entry.length > 0) {
          resolvedIndex = resolvedIndex % entry.length;
          src = entry[resolvedIndex];
        }
      } else if (typeof entry === 'string') {
        resolvedIndex = 0;
        src = entry;
      }
      return { src: src, source: resolvedSource, index: resolvedIndex, label: ps.meta.label };
    }
  }

  // Fallback : premier portrait de la premiere source
  if (window.PortraitSources.length > 0) {
    var fallback = window.PortraitSources[0];
    var entry = fallback[cls];
    if (Array.isArray(entry) && entry.length > 0) {
      src = entry[0];
    } else if (typeof entry === 'string') {
      src = entry;
    }
    return { src: src, source: fallback.meta.key, index: 0, label: fallback.meta.label };
  }

  return { src: '', source: 'dcc', index: 0, label: '' };
};
