import { applyDecorators } from '@nestjs/common';
import { FileColumn, FileColumnOptions } from './file-column.decorator';

export type FileSchemaFieldOptions = FileColumnOptions & {
  // Allow any additional Mongoose-specific options without depending on @nestjs/mongoose types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type PropDecoratorFn = (options?: unknown) => PropertyDecorator;

let cachedPropDecorator: PropDecoratorFn | null | undefined;
const optionalRequire: ((moduleId: string) => unknown) | null = ((): ((
  moduleId: string,
) => unknown) | null => {
  try {
    return (Function(
      'return typeof require !== "undefined" ? require : null',
    ) as () => ((moduleId: string) => unknown) | null)();
  } catch {
    return null;
  }
})();

function getMongoosePropDecorator(): PropDecoratorFn | null {
  if (cachedPropDecorator !== undefined) {
    return cachedPropDecorator;
  }

  try {
    if (!optionalRequire) {
      cachedPropDecorator = null;
      return cachedPropDecorator;
    }
    const mongooseModule = optionalRequire('@nestjs/mongoose') as { Prop?: PropDecoratorFn };
    const prop = mongooseModule?.Prop;
    cachedPropDecorator = typeof prop === 'function' ? prop : null;
  } catch {
    cachedPropDecorator = null;
  }

  return cachedPropDecorator;
}

export function FileSchemaField(options: FileSchemaFieldOptions = {}): PropertyDecorator {
  const fileOptions = {
    ...(options as object),
    isFileField: true,
    bucketName: options.bucketName || 'media-files-bucket',
  };

  const propDecorator = getMongoosePropDecorator();

  if (!propDecorator) {
    return FileColumn(options);
  }

  return applyDecorators(FileColumn(options), propDecorator(fileOptions));
}
