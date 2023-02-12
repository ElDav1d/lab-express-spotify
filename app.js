require("dotenv").config();

const express = require("express");
const hbs = require("hbs");

// require spotify-web-api-node package here:
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();

// Middleware
const logger = require("morgan");
app.use(logger("dev"));

// Settings
app.set("view engine", "hbs");
app.set("views", __dirname + "/views");
require("hbs").registerPartials(__dirname + "/views/partials");
app.use(express.static(__dirname + "/public"));

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

app.get("/artist-search", (req, res, next) => {
  const { artist } = req.query;
  const imageFallback =
    "https://w7.pngwing.com/pngs/75/488/png-transparent-cute-kitten-s-pet-kitty-kitten-thumbnail.png";

  spotifyApi
    .searchArtists(artist, { limit: 50 })
    .then((response) => {
      const { items } = response.body.artists;
      const artistList = items.map(({ name, id, images }) => {
        return {
          name,
          id,
          thumbnail: images[2],
          imageFallback,
          linkTitle: "Albums",
          routePath: `/albums/${id}`,
        };
      });

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
  const albumList = [];
  const imageFallback =
    "https://w7.pngwing.com/pngs/75/488/png-transparent-cute-kitten-s-pet-kitty-kitten-thumbnail.png";
  let artistName;

  spotifyApi
    .getArtist(artistId)
    .then((responseArtist) => {
      artistName = responseArtist.body.name;
      return spotifyApi.getArtistAlbums(artistId);
    })
    .then((response) => {
      const { items } = response.body;

      items.forEach(({ name, id, images }) => {
        albumList.push({
          name,
          id,
          thumbnail: images[2],
          imageFallback,
          linkTitle: "Tracks",
          routePath: `/tracks/${id}`,
        });
      });
    })
    .catch((error) => {
      next(error);
    })
    .finally(() => {
      res.render("albums.hbs", {
        artistName,
        albumList,
      });
    });
});

app.get("/tracks/:albumId", (req, res, next) => {
  const { albumId } = req.params;
  const trackList = [];
  let artistName, albumName;

  spotifyApi
    .getAlbum(albumId)
    .then((response) => {
      const {
        name,
        artists: [artist],
      } = response.body;

      artistName = artist.name;
      albumName = name;

      return spotifyApi.getAlbumTracks(albumId);
    })
    .then((response) => {
      response.body.items.forEach(({ name, preview_url }) => {
        trackList.push({ name, preview_url });
      });

      res.render("tracks.hbs", {
        artistName,
        albumName,
        trackList,
      });
    })
    .catch((error) => next(error));
});

app.listen(3000, () =>
  console.log("My Spotify project running on port 3000 🎧 🥁 🎸 🔊")
);
