import { DataSource } from 'typeorm';
import { Tag } from '../dramas/entities/tag.entity';

type TagSeed = {
  slug: string;
  name: string;
  isActive: boolean;
};

const tagSeeds: TagSeed[] = [
  { slug: 'new', name: 'New', isActive: true },
  { slug: 'popular', name: 'Popular', isActive: true },
  { slug: 'hot', name: 'Hot', isActive: true },
  { slug: 'trending', name: 'Trending', isActive: true },
];

export const seedTags = async (dataSource: DataSource) => {
  const tagRepository = dataSource.getRepository(Tag);

  for (const tagSeed of tagSeeds) {
    const slug = tagSeed.slug.trim().toLowerCase();
    const name = tagSeed.name.trim();

    const existingTag = await tagRepository.findOne({
      where: { slug },
    });

    if (existingTag) {
      existingTag.name = name;
      existingTag.isActive = tagSeed.isActive;
      await tagRepository.save(existingTag);
      console.log(`Updated tag: ${existingTag.slug}`);
      continue;
    }

    const createdTag = await tagRepository.save(
      tagRepository.create({
        slug,
        name,
        isActive: tagSeed.isActive,
      }),
    );
    console.log(`Seeded tag: ${createdTag.slug}`);
  }
};
