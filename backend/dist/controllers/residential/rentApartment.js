"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserApartments = exports.deleteRentApartment = exports.updateRentApartment = exports.getRentApartmentById = exports.getAllRentApartments = exports.createRentApartment = void 0;
const residentialRentApartment_1 = __importDefault(require("../../models/residential/residentialRentApartment"));
const generatePropertyId = async () => {
    try {
        const prefix = "RA-RESREAP";
        const highestShowroom = await residentialRentApartment_1.default.findOne({
            propertyId: { $regex: `^${prefix}\\d+$` }
        }).sort({ propertyId: -1 });
        let nextNumber = 1;
        if (highestShowroom) {
            const match = highestShowroom.propertyId.match(/(\d+)$/);
            if (match && match[1]) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        const propertyId = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
        const existingWithExactId = await residentialRentApartment_1.default.findOne({ propertyId });
        if (existingWithExactId) {
            console.log(`Property ID ${propertyId} already exists, trying next number`);
            const forcedNextNumber = nextNumber + 1;
            const forcedPropertyId = `${prefix}${forcedNextNumber.toString().padStart(4, '0')}`;
            const forcedExisting = await residentialRentApartment_1.default.findOne({ propertyId: forcedPropertyId });
            if (forcedExisting) {
                return generatePropertyId();
            }
            return forcedPropertyId;
        }
        return propertyId;
    }
    catch (error) {
        console.error('Error generating property ID:', error);
        const timestamp = Date.now().toString().slice(-8);
        return `RA-RESREAP${timestamp}`;
    }
};
// Create a new apartment listing
const createRentApartment = async (req, res) => {
    try {
        const propertyId = await generatePropertyId();
        // Deep copy the request body to avoid reference issues
        const apartmentData = JSON.parse(JSON.stringify({
            ...req.body,
            propertyId,
            metadata: {
                ...req.body.metadata,
                createdAt: new Date()
            }
        }));
        // Initialize media structure if not present
        if (!apartmentData.media) {
            apartmentData.media = {
                photos: {
                    exterior: [],
                    interior: [],
                    floorPlan: [],
                    washrooms: [],
                    lifts: [],
                    emergencyExits: [],
                    bedrooms: [],
                    halls: [],
                    storerooms: [],
                    kitchen: []
                },
                documents: [],
                videoTour: '',
                mediaItems: [] // Initialize empty mediaItems array
            };
            console.log('Initialized empty media structure in createRentApartment');
        }
        else {
            // Ensure all required properties exist
            if (!apartmentData.media.photos) {
                apartmentData.media.photos = {};
            }
            // Initialize all photo categories
            ['exterior', 'interior', 'floorPlan', 'washrooms', 'lifts',
                'emergencyExits', 'bedrooms', 'halls', 'storerooms', 'kitchen'].forEach(category => {
                if (!apartmentData.media.photos[category]) {
                    apartmentData.media.photos[category] = [];
                }
            });
            // Initialize other media properties
            if (!apartmentData.media.documents)
                apartmentData.media.documents = [];
            if (!apartmentData.media.videoTour)
                apartmentData.media.videoTour = '';
            // CRITICAL: Always ensure mediaItems exists as an array
            apartmentData.media.mediaItems = Array.isArray(apartmentData.media.mediaItems)
                ? apartmentData.media.mediaItems
                : [];
            console.log('Ensured mediaItems is an array with length:', apartmentData.media.mediaItems.length);
        }
        console.log('Apartment data before save:', JSON.stringify({
            propertyId: apartmentData.propertyId,
            mediaItemsLength: apartmentData.media?.mediaItems?.length || 0
        }));
        const apartment = new residentialRentApartment_1.default(apartmentData);
        // Double-check mediaItems is properly initialized before save
        if (!apartment.media.mediaItems) {
            apartment.media.mediaItems = [];
            // Explicitly mark the field as modified for Mongoose
            apartment.markModified('media.mediaItems');
        }
        await apartment.save();
        // Verify mediaItems was saved correctly
        const savedApartment = await residentialRentApartment_1.default.findOne({ propertyId });
        console.log('Saved apartment mediaItems:', savedApartment?.media?.mediaItems?.length || 0);
        res.status(201).json({
            success: true,
            message: 'Apartment listing created successfully',
            data: apartment
        });
    }
    catch (error) {
        console.error('Error creating apartment listing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create apartment listing',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.createRentApartment = createRentApartment;
const getAllRentApartments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Build filter object based on query parameters
        const filters = {};
        if (req.query.city)
            filters['basicInformation.address.city'] = req.query.city;
        if (req.query.state)
            filters['basicInformation.address.state'] = req.query.state;
        if (req.query.minPrice)
            filters.price = { $gte: parseInt(req.query.minPrice) };
        if (req.query.maxPrice)
            filters.price = { ...filters.price, $lte: parseInt(req.query.maxPrice) };
        if (req.query.bedrooms)
            filters['propertyDetails.bedrooms'] = parseInt(req.query.bedrooms);
        if (req.query.propertyType)
            filters.propertyType = req.query.propertyType;
        const apartments = await residentialRentApartment_1.default.find(filters)
            .skip(skip)
            .limit(limit)
            .sort({ 'metadata.createdAt': -1 });
        const total = await residentialRentApartment_1.default.countDocuments(filters);
        res.status(200).json({
            success: true,
            data: apartments,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    }
    catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartments',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.getAllRentApartments = getAllRentApartments;
// Helper function to ensure mediaItems exists
const ensureMediaItemsExists = async (apartmentId) => {
    try {
        // Update the apartment to ensure mediaItems field exists
        await residentialRentApartment_1.default.updateOne({ _id: apartmentId, 'media.mediaItems': { $exists: false } }, { $set: { 'media.mediaItems': [] } });
    }
    catch (error) {
        console.error('Error ensuring mediaItems exists:', error);
    }
};
// Update the getRentApartmentById function to ensure mediaItems exists
const getRentApartmentById = async (req, res) => {
    try {
        const apartment = await residentialRentApartment_1.default.findOne({ propertyId: req.params.propertyId });
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        // Ensure mediaItems exists
        await ensureMediaItemsExists(req.params.propertyId);
        // Re-fetch to get updated data
        const updatedApartment = await residentialRentApartment_1.default.findOne({ propertyId: req.params.propertyId });
        res.status(200).json({
            success: true,
            data: updatedApartment
        });
    }
    catch (error) {
        console.error('Error fetching apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch apartment',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.getRentApartmentById = getRentApartmentById;
const updateRentApartment = async (req, res) => {
    try {
        const apartment = await residentialRentApartment_1.default.findById(req.params.id);
        const userId = req.body.userId;
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        if (apartment.metadata.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this listing'
            });
        }
        const updatedApartment = await residentialRentApartment_1.default.findByIdAndUpdate(req.params.id, {
            ...req.body,
            metadata: {
                ...apartment.metadata,
                updatedAt: new Date()
            }
        }, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            message: 'Apartment listing updated successfully',
            data: updatedApartment
        });
    }
    catch (error) {
        console.error('Error updating apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update apartment',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.updateRentApartment = updateRentApartment;
const deleteRentApartment = async (req, res) => {
    try {
        const apartment = await residentialRentApartment_1.default.findById(req.params.id);
        const userId = req.body.userId;
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        if (apartment.metadata.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this listing'
            });
        }
        await apartment.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Apartment listing deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete apartment',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.deleteRentApartment = deleteRentApartment;
// Get apartments by user
const getUserApartments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const userId = req.body.userId;
        const apartments = await residentialRentApartment_1.default.find({
            'metadata.createdBy': userId
        })
            .skip(skip)
            .limit(limit)
            .sort({ 'metadata.createdAt': -1 });
        const total = await residentialRentApartment_1.default.countDocuments({
            'metadata.createdBy': userId
        });
        res.status(200).json({
            success: true,
            data: apartments,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                totalRecords: total
            }
        });
    }
    catch (error) {
        console.error('Error fetching user apartments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user apartments',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
exports.getUserApartments = getUserApartments;
