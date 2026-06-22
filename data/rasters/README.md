# Raster files

Place COG files here.

Expected example:

```txt
data/rasters/field-1/2024-06-01/NDVI_cog.tif
data/rasters/field-1/2024-06-01/NDRE_cog.tif
data/rasters/field-1/2024-06-01/EVI_cog.tif
```

The Docker container mounts this folder as:

```txt
/data/rasters
```
