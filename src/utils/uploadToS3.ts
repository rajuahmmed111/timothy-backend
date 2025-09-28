import multer from "multer";
import path from "path";
import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
// import { IUploadedFile } from "../interfaces/file";
import config from "../config";

interface IUploadedFile extends Express.Multer.File {
  path: string;
}

// ---------------- Create uploads folder if not exists ----------------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------- Allowed file types ----------------
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// ---------------- Multer file filter ----------------
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

// ---------------- Multer disk storage ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// ---------------- Multer middleware ----------------
const upload = multer({ storage, fileFilter });

const profileImage = upload.single("profileImage");
const hotelLogo = upload.single("businessLogo");
const hotelRoomImages = upload.array("hotelRoomImages", 5);
const hotelDocs = upload.array("hotelDocs", 5);

const securityImages = upload.array("securityImages", 5);
const securityDocs = upload.array("securityDocs", 5);

const carImages = upload.array("carImages", 5);
const carDocs = upload.array("carDocs", 5);

const attractionBusinessLogo = upload.single("attractionBusinessLogo");
const attractionImages = upload.array("attractionImages", 5);
const attractionDocs = upload.array("attractionDocs", 5);

const uploadMessageImages = upload.array("messageImages", 5);

// ---------------- AWS S3 Client (DigitalOcean Space) ----------------
const s3 = new S3Client({
  region: "nyc3",
  endpoint: config.s3.do_space_endpoint,
  credentials: {
    accessKeyId: config.s3.do_space_accesskey || "",
    secretAccessKey: config.s3.do_space_secret_key || "",
  },
});

// ---------------- S3 Uploader function ----------------
const uploadToS3 = async (file: IUploadedFile, folder: string) => {
  if (!process.env.DO_SPACE_BUCKET) {
    throw new Error(
      "DO_SPACE_BUCKET is not defined in the environment variables."
    );
  }

  const fileStream = fs.createReadStream(file.path);
  const Key = `${folder}/${Date.now()}_${path
    .basename(file.originalname)
    .replace(/\s+/g, "_") // space → underscore
    .replace(/[^a-zA-Z0-9_-]/g, "")}${path.extname(file.originalname)}`;

  const params = {
    Bucket: process.env.DO_SPACE_BUCKET,
    Key,
    Body: fileStream,
    ContentType: file.mimetype,
    ACL: "public-read" as ObjectCannedACL,
  };

  try {
    await s3.send(new PutObjectCommand(params));

    // Local file delete after upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return `https://${config.s3.do_space_bucket}.${(
      config.s3.do_space_endpoint || "nyc3.digitaloceanspaces.com"
    ).replace("https://", "")}/${Key}`;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

// ---------------- Export ----------------
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

  uploadMessageImages,

  uploadToS3, // ✅ Final uploader
};
