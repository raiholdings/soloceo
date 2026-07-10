# svc-rules-engine — build: docker build -t soloceo/svc-rules-engine:v1 .
FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod ./
COPY *.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -o /svc-rules-engine .
FROM gcr.io/distroless/static-debian12
COPY --from=build /svc-rules-engine /svc-rules-engine
EXPOSE 8080
ENTRYPOINT ["/svc-rules-engine"]
