import { DataSource } from 'typeorm';
import { DramaGenre } from '../dramas/entities/drama-genre.entity';
import { Drama } from '../dramas/entities/drama.entity';
import { Episode } from '../dramas/entities/episode.entity';
import { Genre } from '../dramas/entities/genre.entity';

type DramaSeed = {
  title: string;
  description: string;
  thumbnailUrl: string;
  isExclusive: boolean;
  genres: string[];
  episodes: Array<{
    episodeNumber: number;
    title: string;
    coinCost: number;
    videoUrl: string;
  }>;
};

const dramaSeeds: DramaSeed[] = [
  {
    title: 'Hidden Vows',
    description:
      'A contract marriage between a cold CEO and a struggling screenwriter turns into a dangerous romance.',
    thumbnailUrl: 'https://cdn.dramabox.local/thumbnails/hidden-vows.jpg',
    isExclusive: true,
    genres: ['Romance', 'Drama'],
    episodes: [
      {
        episodeNumber: 1,
        title: 'The Unexpected Proposal',
        coinCost: 0,
        videoUrl: 'https://cdn.dramabox.local/videos/hidden-vows/episode-1.mp4',
      },
      {
        episodeNumber: 2,
        title: 'A Deal with Rules',
        coinCost: 0,
        videoUrl: 'https://cdn.dramabox.local/videos/hidden-vows/episode-2.mp4',
      },
      {
        episodeNumber: 3,
        title: 'Jealous Eyes',
        coinCost: 25,
        videoUrl: 'https://cdn.dramabox.local/videos/hidden-vows/episode-3.mp4',
      },
    ],
  },
  {
    title: 'Midnight Reset',
    description:
      'A burned-out surgeon keeps reliving the same night until she uncovers who sabotaged her patient.',
    thumbnailUrl: 'https://cdn.dramabox.local/thumbnails/midnight-reset.jpg',
    isExclusive: false,
    genres: ['Thriller', 'Mystery'],
    episodes: [
      {
        episodeNumber: 1,
        title: '12:01 AM',
        coinCost: 0,
        videoUrl:
          'https://cdn.dramabox.local/videos/midnight-reset/episode-1.mp4',
      },
      {
        episodeNumber: 2,
        title: 'The Same Night Again',
        coinCost: 20,
        videoUrl:
          'https://cdn.dramabox.local/videos/midnight-reset/episode-2.mp4',
      },
      {
        episodeNumber: 3,
        title: 'A Missing Chart',
        coinCost: 20,
        videoUrl:
          'https://cdn.dramabox.local/videos/midnight-reset/episode-3.mp4',
      },
    ],
  },
  {
    title: 'Campus Crown',
    description:
      "A scholarship student accidentally becomes the fake girlfriend of the university's most powerful heir.",
    thumbnailUrl: 'https://cdn.dramabox.local/thumbnails/campus-crown.jpg',
    isExclusive: false,
    genres: ['Romance', 'Youth', 'Comedy'],
    episodes: [
      {
        episodeNumber: 1,
        title: 'The Bet',
        coinCost: 0,
        videoUrl:
          'https://cdn.dramabox.local/videos/campus-crown/episode-1.mp4',
      },
      {
        episodeNumber: 2,
        title: 'Rules of the Fake Relationship',
        coinCost: 0,
        videoUrl:
          'https://cdn.dramabox.local/videos/campus-crown/episode-2.mp4',
      },
      {
        episodeNumber: 3,
        title: 'The Party Scandal',
        coinCost: 15,
        videoUrl:
          'https://cdn.dramabox.local/videos/campus-crown/episode-3.mp4',
      },
      {
        episodeNumber: 4,
        title: 'He Shows Up',
        coinCost: 15,
        videoUrl:
          'https://cdn.dramabox.local/videos/campus-crown/episode-4.mp4',
      },
    ],
  },
];

export const seedDramaContent = async (dataSource: DataSource) => {
  const dramaRepository = dataSource.getRepository(Drama);
  const genreRepository = dataSource.getRepository(Genre);
  const episodeRepository = dataSource.getRepository(Episode);
  const dramaGenreRepository = dataSource.getRepository(DramaGenre);

  for (const dramaSeed of dramaSeeds) {
    let drama = await dramaRepository.findOne({
      where: { title: dramaSeed.title },
    });

    if (!drama) {
      drama = await dramaRepository.save(
        dramaRepository.create({
          title: dramaSeed.title,
          description: dramaSeed.description,
          thumbnailUrl: dramaSeed.thumbnailUrl,
          isExclusive: dramaSeed.isExclusive,
          totalEpisodes: dramaSeed.episodes.length,
        }),
      );
      console.log(`Seeded drama: ${drama.title}`);
    } else {
      drama.totalEpisodes = dramaSeed.episodes.length;
      drama.description = dramaSeed.description;
      drama.thumbnailUrl = dramaSeed.thumbnailUrl;
      drama.isExclusive = dramaSeed.isExclusive;
      drama = await dramaRepository.save(drama);
      console.log(`Updated drama: ${drama.title}`);
    }

    for (const genreName of dramaSeed.genres) {
      let genre = await genreRepository.findOne({
        where: { name: genreName },
      });

      if (!genre) {
        genre = await genreRepository.save(
          genreRepository.create({
            name: genreName,
          }),
        );
        console.log(`Seeded genre: ${genre.name}`);
      }

      const existingDramaGenre = await dramaGenreRepository.findOne({
        where: {
          drama: { id: drama.id },
          genre: { id: genre.id },
        },
        relations: {
          drama: true,
          genre: true,
        },
      });

      if (!existingDramaGenre) {
        await dramaGenreRepository.save(
          dramaGenreRepository.create({
            drama,
            genre,
          }),
        );
      }
    }

    for (const episodeSeed of dramaSeed.episodes) {
      const existingEpisode = await episodeRepository.findOne({
        where: {
          dramaId: drama.id,
          episodeNumber: episodeSeed.episodeNumber,
        },
      });

      if (existingEpisode) {
        existingEpisode.title = episodeSeed.title;
        existingEpisode.coinCost = episodeSeed.coinCost;
        existingEpisode.videoUrl = episodeSeed.videoUrl;
        await episodeRepository.save(existingEpisode);
        continue;
      }

      await episodeRepository.save(
        episodeRepository.create({
          drama,
          dramaId: drama.id,
          episodeNumber: episodeSeed.episodeNumber,
          title: episodeSeed.title,
          coinCost: episodeSeed.coinCost,
          videoUrl: episodeSeed.videoUrl,
        }),
      );
    }
  }
};
