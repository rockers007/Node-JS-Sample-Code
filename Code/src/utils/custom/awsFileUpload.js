const AWS = require("aws-sdk/clients/s3");

const s3 = new AWS({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});
module.exports = class getFiles {
  /*
    Author: Rockers Technologies, USA
    Usage: Upload multiple files in same bucket name of S3 bucket.
    Function Name: uploadFile()
    Paramaters:
      bucketName
      fileName
      file
    Return: Boolean
  */
  async uploadFile(bucketName, fileName, file) {
    const multipleFileParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${bucketName}/${fileName}`,
      Body: file[0].buffer,
    };

    s3.upload(multipleFileParams, (error) => {
      if (error) {
        return res.status(500).json({
          status: "fail",
          message: error,
        });
      }
    });
    return true;
  }

  /*
    Author: Rockers Technologies, USA
    Usage: Upload single files or buffer in given bucket name of S3 bucket.
    Function Name: uploadSingleFile()
    Paramaters:
      bucketName
      fileName
      file
      isStream
    Return: Boolean
  */
  async uploadSingleFile(bucketName, fileName, file, isStream = "no") {
    const singleFileParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${bucketName}/${fileName}`,
      Body: isStream === "yes" ? file : file.buffer,
    };

    s3.upload(singleFileParams, (error) => {
      if (error) {
        return res.status(500).json({
          status: "fail",
          message: error,
        });
      }
    });
    return true;
  }

  /*
    Author: Rockers Technologies, USA
    Usage: Delete single files from given bucket name of S3 bucket.
    Function Name: deleteFile()
    Paramaters:
      fileName
    Return: Boolean
  */
  async deleteFile(fileName) {
    s3.deleteObject(
      {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
      },
      () => {}
    );
    return true;
  }
};
