
import { FastifyPluginAsync } from 'fastify';
import path from 'path';
import { 
  requireAuthentication, 
  getUserCompany, 
  sendSuccess, 
  handleError 
} from '../utils/auth-helpers.js';
import { 
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  isValidFileType,
  isValidFileSize,
  generateSecureFilename,
  writeFileSafely,
  createFileStream,
  deleteFileSafely,
} from '../utils/file-helpers.js';
import { sanitizeFilename } from '../utils/file-helpers.js';

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
    reply.raw.setTimeout(300000);
    
    const authUser = requireAuthentication(request, reply);
    if (!authUser) {
      return;
    }

    try {
      const userCompany = await getUserCompany(fastify.prisma, authUser.id, reply);
      if (!userCompany) {
        return;
      }

      const uploadedFilesIterator = await request.files();
      const filesToScan: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];
      const fileValidationErrors = [];
      let totalFiles = 0;

      for await (const file of uploadedFilesIterator) {
        totalFiles++;

        if (totalFiles > MAX_FILES_PER_UPLOAD) {
          fileValidationErrors.push(`File ${totalFiles}: Too many files. Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`);
          for await (const part of uploadedFilesIterator) { /* no-op */ }
        }

        if (!isValidFileType(file.mimetype)) {
          fileValidationErrors.push(`File ${totalFiles}: Invalid file type. Only PDF, Excel, and PowerPoint files are allowed.`);
          continue;
        }

        const fileBuffer = await file.toBuffer();

        if (!isValidFileSize(fileBuffer.length)) {
          fileValidationErrors.push(`File ${totalFiles}: File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
          continue;
        }

        filesToScan.push({
          buffer: fileBuffer,
          filename: file.filename || `file_${totalFiles}`,
          mimetype: file.mimetype // Store mimetype for later use
        });
      }
      

      if (fileValidationErrors.length > 0) {
        return handleError(reply, 400, 'File validation failed', fileValidationErrors.join(' '));
      }

      if (filesToScan.length === 0) {
        return handleError(reply, 400, 'No files uploaded', 'Please select at least one file to upload');
      }

      // Rest of the code for virus scanning and database operations
      try {
        const virusScanResults = await fastify.virusScan.scanMultipleFiles(filesToScan.map(f => ({ buffer: f.buffer, filename: f.filename })));
        
        const infectedFiles = virusScanResults.filter(result => !result.clean);
        if (infectedFiles.length > 0) {
        const infectedFileDetails = infectedFiles.map(result => ({
          filename: filesToScan.find(f => f.filename === result.threats?.[0])?.filename,
          threats: result.threats || ['Unknown threat']
        }));
          return handleError(reply, 400, 'Virus scan failed', `Infected files detected: ${infectedFileDetails.map(f => f.filename).join(', ')}`);
        }
        
        
      } catch (virusScanError) {
        return handleError(reply, 500, 'Virus scan service unavailable', 'Unable to scan files for security threats');
      }

      const uploadedDocuments = [];
      const uploadErrors = [];

      
      for (const fileToSave of filesToScan) {
        try {
          const originalFileName = sanitizeFilename(fileToSave.filename);
          const secureFileName = generateSecureFilename(originalFileName);
          const companyUploadDir = path.join(process.cwd(), 'uploads', userCompany.id);
          const filePath = path.join(companyUploadDir, secureFileName);
          
          const writeResult = await writeFileSafely(filePath, fileToSave.buffer, originalFileName);
          if (!writeResult.success) {
            uploadErrors.push(`Failed to save ${originalFileName}: ${writeResult.error}`);
            continue;
          }
          
          const documentRecord = await fastify.prisma.document.create({
            data: {
              companyId: userCompany.id,
              name: originalFileName,
              mimeType: fileToSave.mimetype,
              size: fileToSave.buffer.length,
              path: filePath
            }
          });
          
          uploadedDocuments.push(documentRecord);
          await fastify.sendNotification(
            authUser.id, 
            'document', 
            `Document "${originalFileName}" uploaded and scanned successfully`
          );

        } catch (dbError) {
          uploadErrors.push(`Database error for file ${fileToSave.filename}: ${(dbError as Error).message}`);
          console.error(`💥 [UPLOAD] Database or notification error for file ${fileToSave.filename}:`, dbError);
        }
      }

      if (uploadErrors.length > 0) {
        return handleError(reply, 500, 'Partial upload failure', uploadErrors.join(' '));
      }

      sendSuccess(reply, uploadedDocuments, 'Files uploaded successfully');
      
    } catch (error) {
      console.error('❌ [UPLOAD] Global error during upload:', error);
      handleError(reply, 500, 'Internal Server Error', 'An unexpected error occurred during the upload process');
    }
  });
  

  fastify.get('/', async (request, reply) => {
    
    const authenticatedUser = requireAuthentication(request, reply);
    if (!authenticatedUser) {
      return;
    }

    try {
      const userCompany = await getUserCompany(fastify.prisma, authenticatedUser.id, reply);
      if (!userCompany) {
        return;
      }

      const documents = await fastify.prisma.document.findMany({ 
        where: { companyId: userCompany.id }, 
        select: { 
          id: true, 
          name: true, 
          mimeType: true, 
          size: true, 
          createdAt: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      sendSuccess(reply, documents);
    } catch (error) {
      fastify.log.error(error as Error, 'Failed to fetch documents:');
      handleError(reply, 500, 'Failed to fetch documents', 'An error occurred while fetching documents');
    }
  });

  fastify.get('/download/:id', async (request, reply) => {
    
    const authenticatedUser = requireAuthentication(request, reply);
    if (!authenticatedUser) {
      return;
    }
    console.log('✅ [DOWNLOAD] User authenticated:', authenticatedUser.email);

    try {
      const documentId = (request.params as any).id;
      console.log('🔍 [DOWNLOAD] Document ID:', documentId);
      
      if (!documentId || typeof documentId !== 'string') {
        console.log('❌ [DOWNLOAD] Invalid document ID');
        return handleError(reply, 400, 'Invalid document ID', 'Document ID is required and must be a valid string');
      }

      console.log('🔍 [DOWNLOAD] Looking up document in database...');
      const document = await fastify.prisma.document.findUnique({ 
        where: { id: documentId } 
      });
      
      if (!document) {
        console.log('❌ [DOWNLOAD] Document not found');
        return handleError(reply, 404, 'Document not found', 'The requested document does not exist');
      }
      console.log('✅ [DOWNLOAD] Document found:', document.name);

      console.log('🔍 [DOWNLOAD] Checking company access...');
      const company = await fastify.prisma.company.findUnique({ 
        where: { id: document.companyId } 
      });
      
      if (!company || company.userId !== authenticatedUser.id) {
        console.log('❌ [DOWNLOAD] Access denied - user does not own this document');
        return handleError(reply, 403, 'Access denied', 'You do not have permission to access this document');
      }
      console.log('✅ [DOWNLOAD] Access granted');

      try {
        console.log('📁 [DOWNLOAD] Creating file stream for:', document.path);
        const fileStream = createFileStream(document.path);
        
        console.log('📤 [DOWNLOAD] Setting response headers...');
        reply.header('Content-Disposition', `attachment; filename="${document.name}"`);
        reply.header('Content-Type', document.mimeType);
        reply.header('Content-Length', document.size.toString());
        
        console.log('✅ [DOWNLOAD] Sending file stream');
        return reply.send(fileStream);
      } catch (streamError) {
        console.log('💥 [DOWNLOAD] File stream error:', streamError);
        fastify.log.error(streamError as Error, 'Failed to create file stream:');
        return handleError(reply, 500, 'File access error', 'Unable to access the requested file');
      }
      
    } catch (error) {
      console.log('💥 [DOWNLOAD] Critical download error:', error);
      fastify.log.error(error as Error, 'Document download error:');
      handleError(reply, 500, 'Download failed', 'An error occurred while downloading the document');
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    console.log('🗑️ [DELETE] Starting document deletion request');
    
    const authenticatedUser = requireAuthentication(request, reply);
    if (!authenticatedUser) {
      console.log('❌ [DELETE] Authentication failed');
      return;
    }
    console.log('✅ [DELETE] User authenticated:', authenticatedUser.email);

    try {
      const documentId = (request.params as any).id;
      console.log('🔍 [DELETE] Document ID:', documentId);
      
      if (!documentId || typeof documentId !== 'string') {
        console.log('❌ [DELETE] Invalid document ID');
        return handleError(reply, 400, 'Invalid document ID', 'Document ID is required and must be a valid string');
      }

      console.log('🔍 [DELETE] Looking up document in database...');
      const document = await fastify.prisma.document.findUnique({ 
        where: { id: documentId } 
      });
      
      if (!document) {
        console.log('❌ [DELETE] Document not found');
        return handleError(reply, 404, 'Document not found', 'The requested document does not exist');
      }
      console.log('✅ [DELETE] Document found:', document.name);

      console.log('🔍 [DELETE] Checking company access...');
      const company = await fastify.prisma.company.findUnique({ 
        where: { id: document.companyId } 
      });
      
      if (!company || company.userId !== authenticatedUser.id) {
        console.log('❌ [DELETE] Access denied - user does not own this document');
        return handleError(reply, 403, 'Access denied', 'You do not have permission to delete this document');
      }
      console.log('✅ [DELETE] Access granted');

      try {
        console.log('🗑️ [DELETE] Attempting to delete file from filesystem:', document.path);
        const fileDeleted = await deleteFileSafely(document.path);
        
        if (!fileDeleted) {
          console.log('⚠️ [DELETE] File not found on filesystem, but continuing with database cleanup');
        } else {
          console.log('✅ [DELETE] File successfully deleted from filesystem');
        }

        console.log('🗑️ [DELETE] Removing document record from database...');
        await fastify.prisma.document.delete({
          where: { id: documentId }
        });
        console.log('✅ [DELETE] Document record removed from database');

        await fastify.sendNotification(
          authenticatedUser.id, 
          'document', 
          `Document "${document.name}" has been successfully deleted`
        );

        sendSuccess(reply, { 
          id: documentId, 
          name: document.name 
        }, 'Document deleted successfully');
        
      } catch (deleteError) {
        console.log('💥 [DELETE] Error during deletion:', deleteError);
        fastify.log.error(deleteError as Error, 'Document deletion error:');
        return handleError(reply, 500, 'Deletion failed', 'An error occurred while deleting the document');
      }
      
    } catch (error) {
      console.log('💥 [DELETE] Critical deletion error:', error);
      fastify.log.error(error as Error, 'Document deletion error:');
      handleError(reply, 500, 'Deletion failed', 'An error occurred while deleting the document');
    }
  });
};

export default documentRoutes;
