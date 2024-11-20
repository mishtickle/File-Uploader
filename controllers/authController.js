const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure multer for temporary memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file');

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
};

exports.index=(req, res) => {
    res.render('index');
}

exports.login = (req, res) => {
  res.redirect('/profile');
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
};

exports.profile = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const folders = await prisma.folder.findMany({
    where: {
        authorId: req.user.id
    }
  });
  res.render('profile', { user: req.user, folders });
};

exports.getFolder = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const folderName = decodeURIComponent(req.params.name);
    
    try {
        // Get folder with files
        const folder = await prisma.folder.findFirst({
            where: {
                AND: [
                    { name: folderName },
                    { authorId: req.user.id }
                ]
            },
            include: {
                Files: true
            }
        });

        if (!folder) {
            return res.status(404).redirect('/profile');
        }

        // Render the folder view with the folder and its files
        res.render('folder', { 
            user: req.user,
            folder: folder,
            files: folder.Files, 
            formatFileSize: formatFileSize,
            formatDate: formatDate
        });
    } catch (error) {
        console.error('Error getting folder:', error);
        res.status(500).redirect('/profile');
    }
}

exports.createFolder = async (req, res) => {
    const decodedFolderName = decodeURIComponent(req.query.folder);
    const folder = await prisma.folder.findFirst({
        where: {
            AND: [
                { name: decodedFolderName},
                { authorId: req.user.id}
            ]
        }
    })
    if (folder == null){
        await prisma.folder.create({
            data: { name: decodedFolderName, authorId: req.user.id }
        })
    }
    res.redirect('/profile');
}

exports.updateFolder = async (req, res) => {
    const oldName = decodeURIComponent(req.body.oldName);
    const newName = decodeURIComponent(req.body.newName);
    
    try {
        // Check if user owns the folder
        const folder = await prisma.folder.findFirst({
            where: {
                AND: [
                    { name: oldName },
                    { authorId: req.user.id }
                ]
            }
        });

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        // Update the folder name
        await prisma.folder.update({
            where: { id: folder.id },
            data: { name: newName }
        });

        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ error: 'Error updating folder' });
    }
}

exports.deleteFolder = async (req, res) => {
    const folderName = decodeURIComponent(req.body.folderName);
    
    try {
        // Check if user owns the folder
        const folder = await prisma.folder.findFirst({
            where: {
                AND: [
                    { name: folderName },
                    { authorId: req.user.id }
                ]
            },
            include: {
                Files: true // Include the files to check if folder is empty
            }
        });

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        // Check if folder has files
        if (folder.Files && folder.Files.length > 0) {
            return res.status(400).json({ error: 'Cannot delete folder that contains files' });
        }

        // Delete the folder
        await prisma.folder.delete({
            where: { id: folder.id }
        });

        res.redirect('/profile');
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Error deleting folder' });
    }
}

exports.upload = async (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error' });
        } else if (err) {
            return res.status(500).json({ error: 'Server error' });
        }

        try {
            const folderId = parseInt(req.body.folderId);
            
            // Get the folder to check if it exists and belongs to the user
            const folder = await prisma.folder.findFirst({
                where: {
                    AND: [
                        { id: folderId },
                        { authorId: req.user.id }
                    ]
                }
            });

            if (!folder) {
                return res.status(404).json({ error: 'Folder not found' });
            }

            // Upload file to Cloudinary
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
            
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
                resource_type: 'auto',
                folder: `user_${req.user.id}/${folder.name}`,
                public_id: `${Date.now()}-${req.file.originalname}` // Ensure unique filename
            });

            // Create file record in database
            const file = await prisma.files.create({
                data: {
                    name: req.file.originalname,
                    url: cloudinaryResponse.secure_url,
                    size: req.file.size,
                    folderId: folderId,
                    uploadedAt: new Date()
                }
            });

            res.redirect(`/folder/${encodeURIComponent(folder.name)}`);
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ error: 'Error uploading file' });
        }
    });
};

exports.deleteFile = async (req, res) => {
    try {
        const fileId = parseInt(req.body.fileId);
        
        // Get the file to check if it exists and belongs to the user
        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                folder: {
                    authorId: req.user.id
                }
            }
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Extract public_id from Cloudinary URL
        const urlParts = file.url.split('/');
        const publicIdWithExtension = urlParts.slice(-2).join('/');
        const publicId = publicIdWithExtension.split('.')[0];

        try {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
            // Continue with database deletion even if Cloudinary deletion fails
        }

        // Delete from database
        await prisma.files.delete({
            where: {
                id: fileId
            }
        });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Error deleting file' });
    }
};