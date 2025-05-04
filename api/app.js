exports.handler = async (event) => {
  console.log("what is up!!!");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello, world!" }),
  };
};
