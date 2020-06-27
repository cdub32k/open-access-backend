import sharp from "sharp";
import fs from "fs";

(async () => {
  let img = sharp(
    fs.readFileSync(
      __dirname + "/../../../open-access-frontend/javascript/images/hero.jpg"
    )
  );
  await img
    .resize(1784, 1190)
    .jpeg({
      progressive: true,
      compressionLevel: 8,
      adaptiveFiltering: true,
    })
    .toFile(
      __dirname + "/../../../open-access-frontend/javascript/images/hero.jpg"
    );

  img = sharp(
    fs.readFileSync(
      __dirname + "/../../../open-access-frontend/javascript/images/hero2.jpg"
    )
  );
  await img
    .resize(1480, 988)
    .jpeg({
      progressive: true,
      compressionLevel: 8,
      adaptiveFiltering: true,
    })
    .toFile(
      __dirname + "/../../../open-access-frontend/javascript/images/hero2.jpg"
    );
})();
