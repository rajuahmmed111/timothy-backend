import PDFDocument from "pdfkit";
import axios from "axios";
import path from "path";
import fs from "fs"; // Use 'fs' for streams
import { promises as fsPromises } from "fs"; // Use 'fs/promises' for async operations
import { Recipe } from "@prisma/client";

export const generateRecipePDF = async (recipes: Recipe[]): Promise<string> => {
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `recipes_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, "../../uploads", fileName);

  // Ensure the 'uploads' directory exists
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });

  doc.pipe(fs.createWriteStream(filePath)); // Use 'fs.createWriteStream'

  for (const recipe of recipes) {
    // Title
    doc.fontSize(20).font("Helvetica-Bold").text(`Recipe Name: ${recipe.recipeName}`, { underline: true });
    doc.moveDown();

    // Add images in a grid format
    const imageSize = 200; // Width/Height for each image
    const imageMargin = 10; // Margin between images
    let currentX = 50; // Initial x-position for images
    let currentY = doc.y; // Initial y-position for images
    let imagesPerRow = 2; // Number of images per row
    let imageCount = 0;

    if (recipe.recipeImages.length > 0) {
      for (const imageUrl of recipe.recipeImages) {
        try {
          const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const imageBuffer = Buffer.from(response.data, "binary");

          // Check if new row is needed
          if (imageCount > 0 && imageCount % imagesPerRow === 0) {
            currentX = 50;
            currentY += imageSize + imageMargin; // Move to the next row
          }

          // Add image
          doc.image(imageBuffer, currentX, currentY, { width: imageSize, height: imageSize });
          currentX += imageSize + imageMargin; // Move to next column
          imageCount++;
        } catch (error) {
          console.error(`Error downloading image: ${imageUrl}`, error);

          // Handle image error
          doc.rect(currentX, currentY, imageSize, imageSize).stroke().text("Image not available", currentX + 10, currentY + imageSize / 2, {
            width: imageSize - 20,
            align: "center",
          });
          currentX += imageSize + imageMargin;
          imageCount++;
        }
      }
      // Adjust Y position after the images
      currentY += imageSize + imageMargin;
    } else {
      doc.text("No images available", { align: "center" });
      currentY += imageSize + imageMargin;
    }

    // Set Y position to start below the images
    doc.y = currentY;
    doc.moveDown();

    // Recipe Details
    doc.fontSize(12).font("Helvetica").text(`Tags: ${recipe.recipeTag}`);
    doc.text(`Prep Time: ${recipe.prepTime} minutes`);
    doc.text(`Cook Time: ${recipe.cookTime} minutes`);
    doc.text(`Serving: ${recipe.serving}`);
    doc.moveDown();

    // Ingredients
    doc.fontSize(14).font("Helvetica-Bold").text("Ingredients:");
    doc.fontSize(12).font("Helvetica");
    recipe.ingredients.forEach((ingredient, index) => {
      doc.text(`${index + 1}. ${ingredient}`);
    });

    // Instructions
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Instructions:");
    doc.fontSize(12).font("Helvetica");
    recipe.instructions.forEach((instruction, index) => {
      doc.text(`${index + 1}. ${instruction}`);
    });

    // Notes
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Notes:");
    doc.fontSize(12).font("Helvetica");
    recipe.recipeNotes.forEach((note, index) => {
      doc.text(`${index + 1}. ${note}`);
    });

    // Add a new page for the next
    doc.addPage();
  }

  doc.end();
  return filePath;
};
