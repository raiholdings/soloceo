# svc-dlp — build: docker build -t localhost:5000/soloceo/svc-dlp .
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /svc-dlp .

FROM gcr.io/distroless/static-debian12
COPY --from=build /svc-dlp /svc-dlp
EXPOSE 8080
ENTRYPOINT ["/svc-dlp"]
