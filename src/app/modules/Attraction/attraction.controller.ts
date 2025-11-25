import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { AttractionService } from "./attraction.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./attraction.constant";
import { paginationFields } from "../../../constants/pagination";
import { getUserCurrency } from "../../../helpars/detectionLocality";

// create attraction
const createAttraction = catchAsync(async (req: Request, res: Response) => {
  const result = await AttractionService.createAttraction(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attraction created successfully",
    data: result,
  });
});

// create attraction appeal
const createAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AttractionService.createAttractionAppeal(req);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Attraction created successfully",
      data: result,
    });
  }
);

// get all attraction appeals active listing by partnerId
const getAllActiveListingAppealsByPartnerId = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const options = pick(req.query, paginationFields);
    const result =
      await AttractionService.getAllActiveListingAppealsByPartnerId(
        partnerId,
        options
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attractions fetched successfully",
      data: result,
    });
  }
);

// get all attraction appeals available by partnerId
const getAllAvailableListingAppealsByPartnerId = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const options = pick(req.query, paginationFields);
    const result =
      await AttractionService.getAllAvailableListingAppealsByPartnerId(
        partnerId,
        options
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attractions fetched successfully",
      data: result,
    });
  }
);

// get all attractions
const getAllAttractions = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await AttractionService.getAllAttractions(filter, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attractions fetched successfully",
    data: result,
  });
});

// get all attractions appeals
const getAllAttractionsAppeals = catchAsync(
  async (req: Request, res: Response) => {
    // const userCurrency = await getUserCurrency(req);
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsAppeals(
      filter,
      options,
      // userCurrency
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attractions fetched successfully",
      data: result,
    });
  }
);

// get all attractions appeals by attraction id
const getAllAttractionsAppealsByAttractionId = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const attractionId = req.params.attractionId;
    const result =
      await AttractionService.getAllAttractionsAppealsByAttractionId(
        filter,
        options,
        attractionId
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attractions fetched successfully",
      data: result,
    });
  }
);

// get all attractions for partner
const getAllAttractionsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsForPartner(
      partnerId,
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My attractions fetched successfully",
      data: result,
    });
  }
);

// get all attractions appeals for partner
const getAllAttractionsAppealsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const attractionId = req.params.attractionId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await AttractionService.getAllAttractionsAppealsForPartner(
      attractionId,
      filter,
      options
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My attractions fetched successfully",
      data: result,
    });
  }
);

// get single attraction
const getSingleAttraction = catchAsync(async (req: Request, res: Response) => {
  const appealId = req.params.appealId;
  const result = await AttractionService.getSingleAttraction(appealId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction fetched successfully",
    data: result,
  });
});

// get single attraction appeal
const getSingleAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    // const userCurrency = await getUserCurrency(req);
    const appealId = req.params.appealId;
    const result = await AttractionService.getSingleAttractionAppeal(
      appealId,
      // userCurrency
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attraction appeal fetched successfully",
      data: result,
    });
  }
);

// update attraction
const updateAttraction = catchAsync(async (req: Request, res: Response) => {
  const result = await AttractionService.updateAttraction(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction updated successfully",
    data: result,
  });
});

// update appeal
const updateAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AttractionService.updateAttractionAppeal(req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appeal updated successfully",
      data: result,
    });
  }
);

// delete attraction
const deleteAttraction = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const attractionId = req.params.attractionId;
  const result = await AttractionService.deleteAttraction(
    attractionId,
    partnerId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attraction deleted successfully !",
    data: result,
  });
});

// delete appeal
const deleteAttractionAppeal = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const appealId = req.params.appealId;
    const result = await AttractionService.deleteAttractionAppeal(
      appealId,
      partnerId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Appeal deleted successfully !",
      data: result,
    });
  }
);

export const AttractionController = {
  createAttraction,
  createAttractionAppeal,
  getAllActiveListingAppealsByPartnerId,
  getAllAvailableListingAppealsByPartnerId,
  getAllAttractions,
  getAllAttractionsAppeals,
  getAllAttractionsAppealsByAttractionId,
  getAllAttractionsForPartner,
  getAllAttractionsAppealsForPartner,
  getSingleAttraction,
  getSingleAttractionAppeal,
  updateAttraction,
  updateAttractionAppeal,
  deleteAttraction,
  deleteAttractionAppeal,
};
