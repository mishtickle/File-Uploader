exports.getUploadForm = (req, res) => {
    // Generate dynamic URL based on context
    const uploadUrl = `/upload/${req.params.folder || 'default-folder'}`;
  
    // Pass the dynamic URL to the view
    res.render('upload', { uploadUrl });
  };
  
  exports.handleFileUpload = (req, res) => {
    const folder = req.params.folder || 'default-folder';
  
    // Process file upload
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded to folder: ${folder}`);
  };
  