import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

test('1:1 square cover adjustment caps max dimensions at 1000x1000 without padding colors', async () => {
  // Simulate high-res 16:9 product photo (1920x1080)
  const svg = `<svg width="1920" height="1080">
    <rect width="1920" height="1080" fill="#FFFFFF"/>
    <rect x="300" y="150" width="1320" height="780" fill="#3B82F6"/>
  </svg>`;
  const inputBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(inputBuffer).metadata();
  assert.equal(meta.width, 1920);
  assert.equal(meta.height, 1080);

  const origW = meta.width!;
  const origH = meta.height!;
  const targetSquareSize = Math.min(1000, Math.max(500, Math.max(origW, origH)));
  assert.equal(targetSquareSize, 1000, 'Max dimension must be capped at 1000x1000');

  const squareBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: targetSquareSize,
      height: targetSquareSize,
      fit: 'cover',
      position: 'centre',
    })
    .webp()
    .toBuffer();

  const squareMeta = await sharp(squareBuffer).metadata();
  assert.equal(squareMeta.width, 1000);
  assert.equal(squareMeta.height, 1000);
  assert.equal(squareMeta.width! / squareMeta.height!, 1, 'Aspect ratio must be exact 1:1');

  // Verify 400x400 thumbnail
  const thumbBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: 400,
      height: 400,
      fit: 'cover',
      position: 'centre',
    })
    .webp()
    .toBuffer();

  const thumbMeta = await sharp(thumbBuffer).metadata();
  assert.equal(thumbMeta.width, 400);
  assert.equal(thumbMeta.height, 400);
});

test('1:1 square cover adjustment keeps native size between 500x500 and 1000x1000', async () => {
  // Simulate mid-size 4:3 product photo (800x600)
  const svg = `<svg width="800" height="600">
    <rect width="800" height="600" fill="#F8FAFC"/>
    <circle cx="400" cy="300" r="150" fill="#10B981"/>
  </svg>`;
  const inputBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(inputBuffer).metadata();

  const origW = meta.width!;
  const origH = meta.height!;
  const targetSquareSize = Math.min(1000, Math.max(500, Math.max(origW, origH)));
  assert.equal(targetSquareSize, 800, 'Target should be within 500-1000 px range');

  const squareBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: targetSquareSize,
      height: targetSquareSize,
      fit: 'cover',
      position: 'centre',
    })
    .webp()
    .toBuffer();

  const squareMeta = await sharp(squareBuffer).metadata();
  assert.equal(squareMeta.width, 800);
  assert.equal(squareMeta.height, 800);
  assert.ok(squareMeta.width! >= 500 && squareMeta.width! <= 1000);
});

test('1:1 square cover adjustment works for tall portrait images without shrinking product', async () => {
  // Simulate tall portrait product photo (600x900)
  const svg = `<svg width="600" height="900">
    <rect width="600" height="900" fill="#EEEEEE"/>
    <circle cx="300" cy="450" r="200" fill="red"/>
  </svg>`;
  const inputBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(inputBuffer).metadata();

  const origW = meta.width!;
  const origH = meta.height!;
  const targetSquareSize = Math.min(1000, Math.max(500, Math.max(origW, origH)));
  assert.equal(targetSquareSize, 900);

  const squareBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: targetSquareSize,
      height: targetSquareSize,
      fit: 'cover',
      position: 'centre',
    })
    .webp()
    .toBuffer();

  const squareMeta = await sharp(squareBuffer).metadata();
  assert.equal(squareMeta.width, 900);
  assert.equal(squareMeta.height, 900);
  assert.equal(squareMeta.width! / squareMeta.height!, 1, 'Aspect ratio must be exact 1:1');
});
