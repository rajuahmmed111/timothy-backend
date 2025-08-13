import { Request } from "express";
import { uploadFile } from "../../../helpars/fileUploader";

// create attraction
const createAttraction = async (req: Request) => {
    const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
    };

    const attractionImageFiles = files?.attractionImages || [];
    const docsFiles = files?.attractionDocs || [];

    // Upload multiple attraction images
    let attractionImageUrls: string[] = [];
    if (attractionImageFiles.length > 0) {
        const uploads = await Promise.all(
            attractionImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
        );
        attractionImageUrls = uploads.map((img) => img?.secure_url || "");
    }

    // Upload multiple attraction docs
    let attractionDocUrls: string[] = [];
    if (docsFiles.length > 0) {
        const uploads = await Promise.all(
            docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
        );
        attractionDocUrls = uploads.map((img) => img?.secure_url || "");
    }



};

export const AttractionService = {
    createAttraction,
};