# --- build stage ---
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY . .
# go.sum is generated here so we don't have to vendor it by hand.
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o /out/api .

# --- run stage ---
FROM alpine:3.20
RUN adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/api /app/api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/api"]
