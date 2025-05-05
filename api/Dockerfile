FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:22

COPY package.json ${LAMBDA_TASK_ROOT}
COPY package-lock.json ${LAMBDA_TASK_ROOT}

RUN npm install

COPY . ${LAMBDA_TASK_ROOT}

CMD [ "app.handler" ]
