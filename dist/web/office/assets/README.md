# Office Add-in Icon Assets

This directory should contain the following icon files for the Office Add-in:

- `icon-16.png` - 16x16 pixels
- `icon-32.png` - 32x32 pixels
- `icon-80.png` - 80x80 pixels

## Generating Icons

You can generate these icons from an SVG source using ImageMagick or any image editor:

```bash
# Using ImageMagick
convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 32x32 icon-32.png
convert icon.svg -resize 80x80 icon-80.png
```

## Requirements

- Icons must be PNG format
- Icons should have a transparent background
- Icons should be simple and recognizable at small sizes
- Use the Audyn brand colors (blue #4472C4)

## Placeholder Icons

For development, you can use simple placeholder icons. The manifest will still load
but will show default icons until proper assets are provided.
