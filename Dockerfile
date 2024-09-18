# Build stage
FROM node:20-alpine as builder

# Set working directory
WORKDIR /app

COPY . .

# Install dependencies and build
RUN ./scripts/build.sh .

# Production stage
FROM node:20-alpine

# Copy .tgz file from builder
COPY --from=builder /app/app.tgz /app.tgz

# Install production dependencies
RUN apk add --no-cache tini curl git && \
    tar -xzvf /app.tgz --strip 1 && \
    rm /app.tgz && \
    yarn install --production && \
    yarn cache clean && \
    rm -rf /root/.npm /root/.cache 

# Make the user not ROOT
USER 1000

# Set Entry point and command
ENTRYPOINT ["/sbin/tini", "--", "/bin/run"]
# CMD ["-f","/app/bin"]
