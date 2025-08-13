import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ICloudinaryUploadResponse, IUploadedFile } from "../interfaces/file";
import config from "../config";

// Create uploads folder if not exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

// Multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Multer middleware
const upload = multer({ storage, fileFilter });

const profileImage = upload.single("profileImage");

const hotelLogo = upload.single("businessLogo");
// const hotelLogo = upload.single("hotelLogo");
const hotelRoomImages = upload.array("hotelRoomImages", 5);
const hotelDocs = upload.array("hotelDocs", 5);

// const securityLogo = upload.single("securityLogo");
const securityImages = upload.array("securityImages", 5);
const securityDocs = upload.array("securityDocs", 5);

// const securityLogo = upload.single("securityLogo");
const carImages = upload.array("carImages", 5);
const carDocs = upload.array("carDocs", 5);

const attractionBusinessLogo = upload.single("attractionBusinessLogo");
const attractionImages = upload.array("attractionImages", 5);
const attractionDocs = upload.array("attractionDocs", 5);

// Cloudinary configuration
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// Cloudinary uploader function
const uploadToCloudinary = async (
  file: IUploadedFile
): Promise<ICloudinaryUploadResponse | undefined> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file.path)) {
      return reject(new Error(`File not found at ${file.path}`));
    }

    // Determine resource type based on MIME type
    let resourceType: "image" | "video" | "raw" = "raw";

    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else {
      resourceType = "raw"; // For PDF, DOCX, XLSX, ZIP, etc.
    }

    cloudinary.uploader.upload(
      file.path,
      { resource_type: resourceType },
      (error, result) => {
        // Delete local file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        if (error) {
          reject(error);
        } else {
          resolve(result as ICloudinaryUploadResponse | undefined);
        }
      }
    );
  });
};

export const uploadFile = {
  upload,
  profileImage,
  hotelLogo,
  hotelRoomImages,
  hotelDocs,

  securityImages,
  securityDocs,

  carImages,
  carDocs,

  attractionBusinessLogo,
  attractionImages,
  attractionDocs,

  uploadToCloudinary,
};
