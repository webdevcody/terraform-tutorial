FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:22

COPY app.js ${LAMBDA_TASK_ROOT}

CMD [ "app.handler" ]
