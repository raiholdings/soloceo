# svc-rules-engine — build tĩnh, image nhỏ. Build trên VPS: docker build -t localhost:5000/soloceo/svc-rules-engine .
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download || true
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /svc-rules-engine .

FROM gcr.io/distroless/static-debian12
COPY --from=build /svc-rules-engine /svc-rules-engine
EXPOSE 8080
ENTRYPOINT ["/svc-rules-engine"]
