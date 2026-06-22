import type { RasterConfig, VegetationIndex } from '../types/robocare'

const titilerUrl = import.meta.env.VITE_TITILER_URL || 'http://localhost:8000'

export function getRasterConfig(
  taskId: string,
  date: string,
  index: VegetationIndex,
): RasterConfig {
  const tifUrl = `file:///data/rasters/${taskId}/${date}/${index}_cog.tif`
  const params = new URLSearchParams({
    url: tifUrl,
    bidx: '1',
    rescale: '-1,1',
    colormap_name: 'rdylgn',
  })

  return {
    tileJsonUrl: `${titilerUrl}/cog/WebMercatorQuad/tilejson.json?${params.toString()}`,
    tifUrl,
    backendTifFile: tifUrl,
    rescale: '-1,1',
    colormapLabel: 'rdylgn',
    min: -1,
    max: 1,
    percentile: [-1, 1],
    geometryWkt: '',
  }
}
