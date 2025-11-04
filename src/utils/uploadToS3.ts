// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import {
//   S3Client,
//   PutObjectCommand,
//   ObjectCannedACL,
// } from "@aws-sdk/client-s3";
// // import { IUploadedFile } from "../interfaces/file";
// import config from "../config";

// // ---------------- Create uploads folder if not exists ----------------
// const uploadsDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // ---------------- Allowed file types ----------------
// const allowedTypes = [
//   "image/jpeg",
//   "image/png",
//   "image/webp",
//   "application/pdf",
//   "application/msword", // .doc
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
// ];

// // ---------------- Multer file filter ----------------
// const fileFilter = (
//   req: Express.Request,
//   file: Express.Multer.File,
//   cb: multer.FileFilterCallback
// ) => {
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Unsupported file type"));
//   }
// };

// // ---------------- Multer disk storage ----------------
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadsDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `${Date.now()}-${file.originalname}`;
//     cb(null, uniqueName);
//   },
// });

// // ---------------- Multer middleware ----------------
// const upload = multer({ storage, fileFilter });

// const profileImage = upload.single("profileImage");
// const hotelLogo = upload.single("businessLogo");
// const hotelRoomImages = upload.array("hotelRoomImages", 5);
// const hotelDocs = upload.array("hotelDocs", 5);

// const securityImages = upload.array("securityImages", 5);
// const securityDocs = upload.array("securityDocs", 5);

// const carImages = upload.array("carImages", 5);
// const carDocs = upload.array("carDocs", 5);

// const attractionBusinessLogo = upload.single("attractionBusinessLogo");
// const attractionImages = upload.array("attractionImages", 5);
// const attractionDocs = upload.array("attractionDocs", 5);

// const uploadMessageImages = upload.array("messageImages", 5);

// // ---------------- AWS S3 Client (DigitalOcean Space) ----------------
// const s3 = new S3Client({
//   region: "nyc3",
//   endpoint: config.s3.do_space_endpoint,
//   credentials: {
//     accessKeyId: config.s3.do_space_accesskey || "",
//     secretAccessKey: config.s3.do_space_secret_key || "",
//   },
// });

// // ---------------- S3 Uploader function ----------------
// const uploadToS3 = async (file: any, folder: string) => {
//   if (!process.env.DO_SPACE_BUCKET) {
//     throw new Error("DO_SPACE_BUCKET is not defined in the environment variables.");
//   }

//   const fileStream = fs.createReadStream(file.path);
//   const Key = `${folder}/${Date.now()}_${file.originalname}`;

//   const params = {
//     Bucket: process.env.DO_SPACE_BUCKET,
//     Key,
//     Body: fileStream,
//     ContentType: file.mimetype,
//     ACL: "public-read" as ObjectCannedACL,
//   };

//   try {
//     await s3.send(new PutObjectCommand(params));

//     // Local file delete after upload
//     if (fs.existsSync(file.path)) {
//       fs.unlinkSync(file.path);
//     }

//     return `https://${config.s3.do_space_bucket}.${(
//       config.s3.do_space_endpoint || "nyc3.digitaloceanspaces.com"
//     ).replace("https://", "")}/${Key}`;
//   } catch (error) {
//     console.error("Error uploading file to S3:", error);
//     throw error;
//   }
// };

// // ---------------- Export ----------------
// export const uploadFile = {
//   upload,
//   profileImage,
//   hotelLogo,
//   hotelRoomImages,
//   hotelDocs,

//   securityImages,
//   securityDocs,

//   carImages,
//   carDocs,

//   attractionBusinessLogo,
//   attractionImages,
//   attractionDocs,

//   uploadMessageImages,

//   uploadToS3, // ✅ Final uploader
// };

import multer from "multer";
import path from "path";
import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { IUploadedFile } from "../interfaces/file";
import config from "../config";

dotenv.config();

// Create uploads folder if not exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// allowed file types
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/avif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.chart",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.image",
  "application/vnd.oasis.opendocument.text-master",
  "text/plain",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/xml",
  "text/json",
  "application/json",
  "application/octet-stream",
  "video/mp4",
  "video/mpeg",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/quicktime",
  "video/x-flv",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
  "video/ogg",
  "video/x-matroska",
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

// Multer disk storage (local temporary before S3 upload)
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

// Different upload groups
const profileImage = upload.single("profileImage");
const hotelLogo = upload.single("businessLogo");
const hotelImages = upload.array("hotelImages", 5);
const hotelRoomImages = upload.array("hotelRoomImages", 5);
const hotelDocs = upload.array("hotelDocs", 5);

const securityLogo = upload.single("securityLogo");
const securityImages = upload.array("securityImages", 5);
const securityDocs = upload.array("securityDocs", 5);

const carBusinessLogo = upload.single("businessLogo");
const carImages = upload.array("carImages", 5);
const carDocs = upload.array("carDocs", 5);

const attractionBusinessLogo = upload.single("businessLogo");
const attractionImages = upload.array("attractionImages", 5);
const attractionDocs = upload.array("attractionDocs", 5);

const uploadMessageImages = upload.array("messageImages", 5);
const newsImage = upload.array("image", 5);
const advertiseVideo = upload.single("advertiseVideo");
const invertorRelationImage = upload.single("invertorRelationImage");

// -------------------- 🧠 AWS S3 CONFIG --------------------
const s3 = new S3Client({
  region: "eu-west-2",
  credentials: {
    accessKeyId: config.s3_bucket.aws_bucket_accesskey!,
    secretAccessKey: config.s3_bucket.aws_bucket_secret_key!,
  },
});

// Upload to S3
const uploadToS3 = async (file: IUploadedFile): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(file.path)) {
        return reject(new Error(`File not found at ${file.path}`));
      }

      const fileStream = fs.createReadStream(file.path);
      const fileName = `uploads/${Date.now()}-${file.originalname.replace(
        /\s+/g,
        "-"
      )}`;

      const uploadParams = {
        Bucket: config.s3_bucket.aws_bucket_name!,
        Key: fileName,
        Body: fileStream,
        ContentType: file.mimetype,
        // ACL: "public-read" as ObjectCannedACL,
      };

      await s3.send(new PutObjectCommand(uploadParams));

      // remove local file after upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      resolve(fileUrl);
    } catch (error) {
      reject(error);
    }
  });
};

// -------------------- EXPORT --------------------
export const uploadFile = {
  upload,
  profileImage,
  hotelLogo,
  hotelImages,
  hotelRoomImages,
  hotelDocs,

  securityLogo,
  securityImages,
  securityDocs,

  carBusinessLogo,
  carImages,
  carDocs,

  attractionBusinessLogo,
  attractionImages,
  attractionDocs,

  uploadMessageImages,
  newsImage,
  advertiseVideo,
  invertorRelationImage,

  uploadToS3,
};
