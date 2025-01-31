require("dotenv").config();

const express = require("express");
const hbs = require("hbs");

// require spotify-web-api-node package here:
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();

// Middleware
const logger = require("morgan");
const { response } = require("express");
app.use(logger("dev"));

// Settings
app.set("view engine", "hbs");
app.set("views", __dirname + "/views");
require("hbs").registerPartials(__dirname + "/views/partials");
app.use(express.static(__dirname + "/public"));

// Locals
app.locals.imageFallback =
  "https://w7.pngwing.com/pngs/75/488/png-transparent-cute-kitten-s-pet-kitty-kitten-thumbnail.png";

// setting the spotify-api goes here:
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

// Retrieve an access token
spotifyApi
  .clientCredentialsGrant()
  .then((data) => {
    spotifyApi.setAccessToken(data.body["access_token"]);
    console;
  })
  .catch((error) =>
    console.log("Something went wrong when retrieving an access token", error)
  );

// Our routes go here:

app.get("/index", (req, res, next) => {
  res.render("home.hbs");
});

app.get("/artist-search", async (req, res, next) => {
  const { artist } = req.query;
  const callLimit = 50;
  const callsQueue = [];

  spotifyApi
    .searchArtists(artist)
    .then((response) => {
      const { total } = response.body.artists;
      const callsCount = Math.ceil(total / callLimit);

      for (let i = 0; i < callsCount; i++) {
        callsQueue.push(
          spotifyApi.searchArtists(artist, {
            limit: callLimit,
            offset: i * callLimit,
          })
        );
      }
    })
    .then(() => {
      return Promise.all(callsQueue);
    })
    .then((response) => {
      const artistList = [];

      response.forEach((stack) =>
        stack.body.artists.items.forEach(({ name, id, images }) => {
          artistList.push({
            name,
            id,
            thumbnail: images[2],
            linkTitle: "Albums",
            routePath: `/albums/${id}`,
          });
        })
      );

      res.render("artist-search-results.hbs", {
        artistList,
      });
    })
    .catch((error) => {
      next(error);
    });
});

app.get("/albums/:artistId", (req, res, next) => {
  const { artistId } = req.params;

  Promise.all([
    spotifyApi.getArtist(artistId),
    spotifyApi.getArtistAlbums(artistId),
  ])
    .then((response) => {
      const [artist, albums] = response;
      const albumList = albums.body.items.map(({ name, id, images }) => {
        return {
          name,
          id,
          thumbnail: images[2],
          linkTitle: "Tracks",
          routePath: `/tracks/${id}`,
        };
      });

      res.render("albums.hbs", {
        artistName: artist.body.name,
        albumList,
      });
    })
    .catch((error) => next(error));
});

app.get("/tracks/:albumId", (req, res, next) => {
  const { albumId } = req.params;

  Promise.all([
    spotifyApi.getAlbum(albumId),
    spotifyApi.getAlbumTracks(albumId),
  ])
    .then((response) => {
      const [album, tracks] = response;

      const {
        name,
        artists: [artist],
      } = album.body;

      const trackList = tracks.body.items.map(({ name, preview_url }) => {
        return { name, preview_url };
      });

      res.render("tracks.hbs", {
        artistName: artist.name,
        albumName: name,
        trackList,
      });
    })
    .catch((error) => next(error));
});

app.listen(3000, () =>
  console.log("My Spotify project running on port 3000 🎧 🥁 🎸 🔊")
);
