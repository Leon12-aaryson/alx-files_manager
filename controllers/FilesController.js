/**
 * Module for handling file-related operations in the API.
 */
/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
import { tmpdir } from 'os'; // Importing OS module for temporary directory
import { promisify } from 'util'; // Importing promisify to convert callback-based functions to promises
import Queue from 'bull/lib/queue'; // Importing Queue for asynchronous task handling
import { v4 as uuidv4 } from 'uuid'; // Importing uuidv4 for generating unique identifiers
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs'; // Importing file system modules for file operations
import { join as joinPath } from 'path'; // Importing path module for joining paths
import { Request, Response } from 'express'; // Importing Express types for request and response objects
import { contentType } from 'mime-types'; // Importing mime-types for determining content type
import mongoDBCore from 'mongodb/lib/core'; // Importing MongoDB core for ObjectId generation
import dbClient from '../utils/db'; // Importing database client for interacting with the database
import { getUserFromXToken } from '../utils/auth'; // Importing function for retrieving user from X-Token header

// Valid file types
const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};
const ROOT_FOLDER_ID = 0; // Root folder ID
const DEFAULT_ROOT_FOLDER = 'files_manager'; // Default root folder name
const mkDirAsync = promisify(mkdir); // Promisifying mkdir function
const writeFileAsync = promisify(writeFile); // Promisifying writeFile function
const statAsync = promisify(stat); // Promisifying stat function
const realpathAsync = promisify(realpath); // Promisifying realpath function
const MAX_FILES_PER_PAGE = 20; // Maximum number of files per page
const fileQueue = new Queue('thumbnail generation'); // Creating a new queue for thumbnail generation
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8'); // Null ID for MongoDB
const isValidId = (id) => { // Function to validate if a given ID is valid
  const size = 24;
  let i = 0;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  while (i < size) {
    const c = id[i];
    const code = c.charCodeAt(0);

    if (!charRanges.some((range) => code >= range[0] && code <= range[1])) {
      return false;
    }
    i += 1;
  }
  return true;
};

export default class FilesController {
  /**
   * Uploads a file.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  static async postUpload(req, res) {
    const { user } = req; // Extracting user information from request
    const name = req.body ? req.body.name : null; // Extracting file name from request body
    const type = req.body ? req.body.type : null; // Extracting file type from request body
    const parentId = req.body && req.body.parentId ? req.body.parentId : ROOT_FOLDER_ID; // Extracting parent ID from request body
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false; // Extracting isPublic flag from request body
    const base64Data = req.body && req.body.data ? req.body.data : ''; // Extracting base64-encoded file data from request body

    // Validating if name, type, and data are provided
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }
    if (!req.body.data && type !== VALID_FILE_TYPES.folder) {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    // Validating parent ID
    if ((parentId !== ROOT_FOLDER_ID) && (parentId !== ROOT_FOLDER_ID.toString())) {
      const file = await (await dbClient.filesCollection())
        .findOne({
          _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        });

      if (!file) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (file.type !== VALID_FILE_TYPES.folder) {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    const userId = user._id.toString(); // Getting user ID
    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
      ? process.env.FOLDER_PATH.trim()
      : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER); // Setting base directory for file storage
    // Default baseDir == '/tmp/files_manager' or (on Windows) '%USERPROFILE%/AppData/Local/Temp/files_manager';

    // Creating a new file object
    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };

    await mkDirAsync(baseDir, { recursive: true }); // Creating base directory if it doesn't exist

    if (type !== VALID_FILE_TYPES.folder) {
      const localPath = joinPath(baseDir, uuidv4()); // Generating a unique path for the file
      await writeFileAsync(localPath, Buffer.from(base64Data, 'base64')); // Writing file data to disk
      newFile.localPath = localPath; // Setting local path for the new file
    }

    // Inserting the new file into the database
    const insertionInfo = await (await dbClient.filesCollection()).insertOne(newFile);
    const fileId = insertionInfo.insertedId.toString(); // Getting the inserted file ID

    // Starting thumbnail generation worker if the file is an image
    if (type === VALID_FILE_TYPES.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }

    // Sending a success response with the details of the uploaded file
    res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? 0
        : parentId,
    });
  }

  /**
   * Retrieves information about a specific file.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  static async getShow(req, res) {
    const { user } = req; // Extracting user information from request
    const id = req.params ? req.params.id : NULL_ID; // Extracting file ID from request parameters
    const userId = user._id.toString(); // Getting user ID
    const file = await (await dbClient.filesCollection())
      .findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
        userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
      });

    // Checking if the file exists
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Sending information about the file as a response
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Retrieves a list of files associated with a specific user.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  static async getIndex(req, res) {
    const { user } = req; // Extracting user information from request
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString(); // Extracting parent ID from request query parameters
    const page = /\d+/.test((req.query.page || '').toString()) // Extracting page number from request query parameters
      ? Number.parseInt(req.query.page, 10)
      : 0;

    // Filter for retrieving files based on user ID and parent ID
    const filesFilter = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };

    // Aggregating files based on the filter and pagination
    const files = await (await (await dbClient.filesCollection())
      .aggregate([
        { $match: filesFilter },
        { $sort: { _id: -1 } },
        { $skip: page * MAX_FILES_PER_PAGE },
        { $limit: MAX_FILES_PER_PAGE },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ])).toArray();

    // Sending the list of files as a response
    res.status(200).json(files);
  }

  // Other methods like putPublish, putUnpublish, and getFile are implemented similarly...
}
