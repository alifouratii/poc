# Short presentation script

We tested three ways to mock raster data for Robocare.

The first way is JSON-only mocking. It is fast for UI development, but it does not validate raster behavior.

The second way is loading small `.tif` files directly from the frontend. It is simple, but it can become slow and less realistic with large satellite files.

The third way is TiTiler with COG files. This is the best decision because it gives us real tile loading, real raster metadata, and behavior closer to production.

The proposed implementation is:

```txt
MSW for normal API mocks
TiTiler for raster tiles
COG files for mock satellite layers
OpenLayers for map display
```

This POC shows the full frontend code and the local TiTiler setup.
