import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ICloudinaryUploadResponse, IUploadedFile } from "../interfaces/file";
import config from "../config";

const storage = multer.diskStorage({
  destination: function (req, file, cd) {
    cd(null, path.join(process.cwd(), "uploads"));
  },
  filename: function (req, file, cd) {
    cd(null, file.originalname);
  },
});

// Configuration
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

const upload = multer({ storage: storage });

const profileImage = upload.single("profileImage");

const uploadToCloudinary = async (
  file: IUploadedFile
): Promise<ICloudinaryUploadResponse | undefined> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      // {public_id: file.originalname},
      (error: Error, result: ICloudinaryUploadResponse) => {
        fs.unlinkSync(file.path);
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

export const uploadFile = {
  upload,
  profileImage,
  uploadToCloudinary,
};
