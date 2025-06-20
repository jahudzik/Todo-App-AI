import { prisma } from './index';

async function main(): Promise<void> {
  console.log('Seeding database...');
  
  // Create demo todo lists with items
  const personalList = await prisma.todoList.create({
    data: {
      name: 'Personal Tasks',
      orderIndex: 100,
      userId: 'demo',
      items: {
        create: [
          {
            title: 'Buy groceries',
            positionInList: 100,
            isCompleted: false,
          },
          {
            title: 'Call dentist',
            positionInList: 200,
            isCompleted: true,
          },
          {
            title: 'Plan weekend trip',
            positionInList: 300,
            isCompleted: false,
          },
        ],
      },
    },
  });

  const workList = await prisma.todoList.create({
    data: {
      name: 'Work Projects',
      orderIndex: 200,
      userId: 'demo',
      items: {
        create: [
          {
            title: 'Finish quarterly report',
            positionInList: 100,
            isCompleted: false,
          },
          {
            title: 'Team meeting preparation',
            positionInList: 200,
            isCompleted: true,
          },
        ],
      },
    },
  });

  console.log('Seeded database with:', {
    personalList: { id: personalList.id, name: personalList.name },
    workList: { id: workList.id, name: workList.name },
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });