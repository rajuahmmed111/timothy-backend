import { Request } from "express";
import prisma from "../../../shared/prisma";
import { uploadFile } from "../../../helpars/fileUploader";

// create news room
const createNewsRoom = async (req: Request) => {
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const imageFiles = files?.image || [];

  // upload multiple news room images
  let image: string[] = [];
  if (imageFiles.length > 0) {
    const ImageUploads = await Promise.all(
      imageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    image = ImageUploads.map((img) => img?.secure_url || "");
  }

  const { tagline, title, summary, category, country, author } = req.body;

  const newsRoom = await prisma.newsroom.create({
    data: {
      tagline,
      title,
      summary,
      category,
      country,
      author,
      image,
    },
  });

  return newsRoom;
};

export const NewsRoomService = { createNewsRoom };
